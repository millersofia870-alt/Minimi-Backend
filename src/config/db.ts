import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { env } from './env';

// Shared connection pool. Using mysql2 directly (raw parameterized SQL via
// the repo modules in src/db/) rather than Prisma Client at runtime — see
// README "Why raw SQL instead of Prisma Client" for context. The schema in
// prisma/schema.prisma stays the source of truth for the data model; this
// pool executes prisma/migrations/001_init.sql, which mirrors it exactly.
export let pool: mysql.Pool;

function parseDatabaseUrl(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const protocol = parsed.protocol.replace(':', '');
  if (protocol !== 'mysql' && protocol !== 'mysql2') {
    throw new Error(`Unsupported database protocol: ${protocol}`);
  }

  return {
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: (parsed.pathname.replace(/^\/+/, '') || 'minimi_agri').trim(),
  };
}

export async function initializeDatabase() {
  if (pool) {
    return pool;
  }

  const { host, port, user, password, database } = parseDatabaseUrl(env.databaseUrl);

  const maxRetries = 10;
  const retryDelayMs = 3000;

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const adminConnection = await mysql.createConnection({
        host,
        port,
        user,
        password,
        connectTimeout: 10000,
      });

      try {
        await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`Database ready: ${database}`);
      } finally {
        await adminConnection.end();
      }

      pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        multipleStatements: true,
        dateStrings: false,
      });

      await pool.query('SELECT 1');

      const schemaPath = path.resolve(process.cwd(), 'prisma/migrations/001_init.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);

      const [columns] = await pool.query('SHOW COLUMNS FROM service_requests LIKE ?', ['paid_at']);
      if ((columns as any[]).length === 0) {
        await pool.query('ALTER TABLE service_requests ADD COLUMN paid_at DATETIME NULL');
      }

      const [feeColumns] = await pool.query('SHOW COLUMNS FROM service_requests LIKE ?', ['service_fee']);
      if ((feeColumns as any[]).length === 0) {
        await pool.query('ALTER TABLE service_requests ADD COLUMN service_fee DECIMAL(12,2) NULL');
      }

      const [feeStatusColumns] = await pool.query('SHOW COLUMNS FROM service_requests LIKE ?', ['fee_status']);
      if ((feeStatusColumns as any[]).length === 0) {
        await pool.query("ALTER TABLE service_requests ADD COLUMN fee_status VARCHAR(30) NOT NULL DEFAULT 'not_set'");
      }

      // Migration 002: Add vet_id to payments table
      const [payVetColumns] = await pool.query('SHOW COLUMNS FROM payments LIKE ?', ['vet_id']);
      if ((payVetColumns as any[]).length === 0) {
        const migration002Path = path.resolve(process.cwd(), 'prisma/migrations/002_add_vet_id_to_payments.sql');
        if (fs.existsSync(migration002Path)) {
          const sql = fs.readFileSync(migration002Path, 'utf8');
          await pool.query(sql);
        }
      }

      // Migration 003: Add subscription_packages and farmer_subscriptions tables
      const migration003Path = path.resolve(process.cwd(), 'prisma/migrations/003_add_subscriptions.sql');
      if (fs.existsSync(migration003Path)) {
        const sql = fs.readFileSync(migration003Path, 'utf8');
        await pool.query(sql);
      }

      // Migration 004: wallets, immutable transaction ledger, and vet profile images.
      const migration004Path = path.resolve(process.cwd(), 'prisma/migrations/004_add_wallets_and_vet_profiles.sql');
      if (fs.existsSync(migration004Path)) {
        const [walletTables] = await pool.query("SHOW TABLES LIKE 'wallets'");
        if ((walletTables as any[]).length === 0) await pool.query(fs.readFileSync(migration004Path, 'utf8'));
        const [profileImageColumns] = await pool.query('SHOW COLUMNS FROM vets LIKE ?', ['profile_image_url']);
        if ((profileImageColumns as any[]).length === 0) await pool.query('ALTER TABLE vets ADD COLUMN profile_image_url LONGTEXT NULL');
      }

      // Ensure capture_images.image_url is LONGTEXT for base64 data URLs.
      const [captureImageColumns] = await pool.query('SHOW COLUMNS FROM capture_images WHERE Field = ?', ['image_url']);
      const captureImageType = (captureImageColumns as any[])[0]?.Type ?? '';
      if (captureImageType.includes('varchar')) {
        await pool.query('ALTER TABLE capture_images MODIFY COLUMN image_url LONGTEXT NOT NULL');
      }

      console.log(`Schema initialized successfully in database: ${database}`);
      return pool;
    } catch (error: any) {
      lastError = error;
      console.warn(`Database connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  console.error(`Failed to initialize database after ${maxRetries} attempts`);
  throw lastError;
}
