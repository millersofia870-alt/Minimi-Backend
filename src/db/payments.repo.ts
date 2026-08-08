import { pool } from '../config/db';
import { newId } from './id';

export interface Payment {
  id: string;
  requestId: string;
  farmerId: string;
  vetId: string | null;
  amount: number;
  mpesaReceiptNumber: string | null;
  phone: string;
  status: 'pending' | 'success' | 'failed';
  checkoutRequestId: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

function mapRow(row: any): Payment {
  return {
    id: row.id,
    requestId: row.request_id,
    farmerId: row.farmer_id,
    vetId: row.vet_id ?? null,
    amount: Number(row.amount),
    mpesaReceiptNumber: row.mpesa_receipt_number,
    phone: row.phone,
    status: row.status,
    checkoutRequestId: row.checkout_request_id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function create(data: {
  requestId: string; farmerId: string; vetId: string | null; amount: number; phone: string; checkoutRequestId: string;
}): Promise<Payment> {
  const id = newId();
  await pool.query(
    `INSERT INTO payments (id, request_id, farmer_id, vet_id, amount, phone, checkout_request_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, data.requestId, data.farmerId, data.vetId ?? null, data.amount, data.phone, data.checkoutRequestId]
  );
  const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);
  return mapRow((rows as any[])[0]);
}

export async function findByCheckoutRequestId(checkoutRequestId: string): Promise<Payment | null> {
  const [rows] = await pool.query('SELECT * FROM payments WHERE checkout_request_id = ?', [checkoutRequestId]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function findLatestByRequest(requestId: string): Promise<Payment | null> {
  const [rows] = await pool.query(
    'SELECT * FROM payments WHERE request_id = ? ORDER BY created_at DESC LIMIT 1',
    [requestId]
  );
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function updateStatus(
  id: string,
  status: 'success' | 'failed',
  mpesaReceiptNumber?: string
): Promise<Payment> {
  await pool.query(
    'UPDATE payments SET status = ?, mpesa_receipt_number = ?, completed_at = NOW() WHERE id = ?',
    [status, mpesaReceiptNumber ?? null, id]
  );
  const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);
  return mapRow((rows as any[])[0]);
}

export async function listSuccessByRequest(requestId: string): Promise<Payment[]> {
  const [rows] = await pool.query(
    "SELECT * FROM payments WHERE request_id = ? AND status = 'success' ORDER BY created_at ASC",
    [requestId]
  );
  return (rows as any[]).map(mapRow);
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listByFarmer(
  farmerId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<Payment & { farmerName: string; vetName: string | null }>> {
  const page = Math.max(1, Number(options?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options?.limit || 10)));
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM payments WHERE farmer_id = ?',
    [farmerId]
  );
  const total = Number((countRows as any[])[0]?.total || 0);

  const [rows] = await pool.query(
    `SELECT p.*,
            f.full_name AS farmer_name,
            v.full_name AS vet_name
     FROM payments p
     JOIN farmers f ON f.id = p.farmer_id
     LEFT JOIN vets v ON v.id = p.vet_id
     WHERE p.farmer_id = ?
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [farmerId, limit, offset]
  );

  const items = (rows as any[]).map((r) => ({ ...mapRow(r), farmerName: r.farmer_name, vetName: r.vet_name ?? null }));
  const totalPages = Math.ceil(total / limit) || 1;

  return { items, total, page, limit, totalPages };
}

export async function listByVet(
  vetId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<Payment & { farmerName: string; vetName: string | null }>> {
  const page = Math.max(1, Number(options?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options?.limit || 10)));
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM payments WHERE vet_id = ?',
    [vetId]
  );
  const total = Number((countRows as any[])[0]?.total || 0);

  const [rows] = await pool.query(
    `SELECT p.*,
            f.full_name AS farmer_name,
            v.full_name AS vet_name
     FROM payments p
     JOIN farmers f ON f.id = p.farmer_id
     LEFT JOIN vets v ON v.id = p.vet_id
     WHERE p.vet_id = ?
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [vetId, limit, offset]
  );

  const items = (rows as any[]).map((r) => ({ ...mapRow(r), farmerName: r.farmer_name, vetName: r.vet_name ?? null }));
  const totalPages = Math.ceil(total / limit) || 1;

  return { items, total, page, limit, totalPages };
}

export async function sumSuccessSince(since: Date): Promise<number> {
  const [[vetRows], [subRows]] = await Promise.all([
    pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'success' AND completed_at >= ?",
      [since]
    ),
    pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM farmer_subscriptions WHERE status = 'active' AND start_date >= ?",
      [since]
    ),
  ]);
  return Number((vetRows as any[])[0].total) + Number((subRows as any[])[0].total);
}

export async function sumSuccessAllTime(): Promise<number> {
  const [[vetRows], [subRows]] = await Promise.all([
    pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'success'"),
    pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM farmer_subscriptions WHERE status = 'active'"),
  ]);
  return Number((vetRows as any[])[0].total) + Number((subRows as any[])[0].total);
}

export async function earningsPerVet(from?: Date, to?: Date): Promise<{ vetId: string; total: number }[]> {
  const clauses = ["p.status = 'success'", 'sr.vet_id IS NOT NULL'];
  const params: any[] = [];
  if (from) { clauses.push('p.completed_at >= ?'); params.push(from); }
  if (to) { clauses.push('p.completed_at <= ?'); params.push(to); }

  const [rows] = await pool.query(
    `SELECT sr.vet_id AS vet_id, SUM(p.amount) AS total
     FROM payments p
     JOIN service_requests sr ON sr.id = p.request_id
     WHERE ${clauses.join(' AND ')}
     GROUP BY sr.vet_id
     ORDER BY total DESC`,
    params
  );
  return (rows as any[]).map((r) => ({ vetId: r.vet_id, total: Number(r.total) }));
}

export async function earningsByCounty(from?: Date, to?: Date): Promise<{ county: string; total: number }[]> {
  const vetClauses = ["p.status = 'success'"];
  const vetParams: any[] = [];
  if (from) { vetClauses.push('p.completed_at >= ?'); vetParams.push(from); }
  if (to) { vetClauses.push('p.completed_at <= ?'); vetParams.push(to); }

  const subClauses = ["fs.status = 'active'"];
  const subParams: any[] = [];
  if (from) { subClauses.push('fs.start_date >= ?'); subParams.push(from); }
  if (to) { subClauses.push('fs.start_date <= ?'); subParams.push(to); }

  const [[vetRows], [subRows]] = await Promise.all([
    pool.query(
      `SELECT sr.county AS county, COALESCE(SUM(p.amount), 0) AS total
       FROM payments p
       JOIN service_requests sr ON sr.id = p.request_id
       WHERE ${vetClauses.join(' AND ')}
       GROUP BY sr.county`,
      vetParams
    ),
    pool.query(
      `SELECT f.county AS county, COALESCE(SUM(fs.amount), 0) AS total
       FROM farmer_subscriptions fs
       JOIN farmers f ON f.id = fs.farmer_id
       WHERE ${subClauses.join(' AND ')}
       GROUP BY f.county`,
      subParams
    ),
  ]);

  const countyMap = new Map<string, number>();
  for (const r of vetRows as any[]) countyMap.set(r.county, Number(r.total));
  for (const r of subRows as any[]) {
    countyMap.set(r.county, (countyMap.get(r.county) ?? 0) + Number(r.total));
  }

  return Array.from(countyMap.entries())
    .map(([county, total]) => ({ county, total }))
    .sort((a, b) => b.total - a.total);
}

// Unified county revenue: vet-service payments + subscription payments
export async function earningsByCountyWithSubscriptions(from?: Date, to?: Date): Promise<{ county: string; vetServiceTotal: number; subscriptionTotal: number; total: number }[]> {
  const vetClauses = ["p.status = 'success'"];
  const vetParams: any[] = [];
  if (from) { vetClauses.push('p.completed_at >= ?'); vetParams.push(from); }
  if (to) { vetClauses.push('p.completed_at <= ?'); vetParams.push(to); }

  const subClauses = ["fs.status = 'active'"];
  const subParams: any[] = [];
  if (from) { subClauses.push('fs.start_date >= ?'); subParams.push(from); }
  if (to) { subClauses.push('fs.start_date <= ?'); subParams.push(to); }

  const [vetRows] = await pool.query(
    `SELECT sr.county AS county, SUM(p.amount) AS total
     FROM payments p
     JOIN service_requests sr ON sr.id = p.request_id
     WHERE ${vetClauses.join(' AND ')}
     GROUP BY sr.county`,
    vetParams
  );

  const [subRows] = await pool.query(
    `SELECT f.county AS county, SUM(fs.amount) AS total
     FROM farmer_subscriptions fs
     JOIN farmers f ON f.id = fs.farmer_id
     WHERE ${subClauses.join(' AND ')}
     GROUP BY f.county`,
    subParams
  );

  const vetMap = new Map<string, number>();
  for (const r of vetRows as any[]) vetMap.set(r.county, Number(r.total));

  const subMap = new Map<string, number>();
  for (const r of subRows as any[]) subMap.set(r.county, Number(r.total));

  const allCounties = new Set([...vetMap.keys(), ...subMap.keys()]);
  const results = Array.from(allCounties).map((county) => {
    const vetServiceTotal = vetMap.get(county) ?? 0;
    const subscriptionTotal = subMap.get(county) ?? 0;
    return { county, vetServiceTotal, subscriptionTotal, total: vetServiceTotal + subscriptionTotal };
  });

  return results.sort((a, b) => b.total - a.total);
}

// Unified farmer payments: vet service + subscription, paginated
export async function listAllByFarmerUnified(
  farmerId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<{ id: string; type: 'vet_service' | 'subscription'; amount: number; status: string; mpesaReceiptNumber: string | null; phone: string | null; description: string; createdAt: Date; completedAt: Date | null }>> {
  const page = Math.max(1, Number(options?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options?.limit || 10)));
  const offset = (page - 1) * limit;

  // Count
  const [countRows] = await pool.query(
    `SELECT (
       SELECT COUNT(*) FROM payments WHERE farmer_id = ?
     ) + (
       SELECT COUNT(*) FROM farmer_subscriptions WHERE farmer_id = ?
     ) AS total`,
    [farmerId, farmerId]
  );
  const total = Number((countRows as any[])[0]?.total || 0);

  const [rows] = await pool.query(
    `(
       SELECT p.id, 'vet_service' AS type, p.amount, p.status, p.mpesa_receipt_number,
              p.phone, COALESCE(sr.animal_or_crop_type, 'Vet Service') AS description,
              p.created_at, p.completed_at
       FROM payments p
       LEFT JOIN service_requests sr ON sr.id = p.request_id
       WHERE p.farmer_id = ?
     )
     UNION ALL
     (
       SELECT fs.id, 'subscription' AS type, fs.amount,
              CASE WHEN fs.status = 'active' THEN 'success'
                   WHEN fs.status = 'cancelled' THEN 'failed'
                   ELSE fs.status END AS status,
              NULL AS mpesa_receipt_number,
              NULL AS phone,
              COALESCE(sp.name, 'Subscription') AS description,
              fs.created_at,
              fs.start_date AS completed_at
       FROM farmer_subscriptions fs
       LEFT JOIN subscription_packages sp ON sp.id = fs.package_id
       WHERE fs.farmer_id = ?
     )
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [farmerId, farmerId, limit, offset]
  );

  const items = (rows as any[]).map((r) => ({
    id: r.id,
    type: r.type as 'vet_service' | 'subscription',
    amount: Number(r.amount),
    status: r.status,
    mpesaReceiptNumber: r.mpesa_receipt_number ?? null,
    phone: r.phone ?? null,
    description: r.description,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? null,
  }));

  const totalPages = Math.ceil(total / limit) || 1;
  return { items, total, page, limit, totalPages };
}

// Admin: all payments (vet service + subscription) paginated
export async function listAllPaymentsAdmin(
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<{ id: string; type: 'vet_service' | 'subscription'; farmerId: string; farmerName: string; amount: number; status: string; description: string; createdAt: Date; completedAt: Date | null }>> {
  const page = Math.max(1, Number(options?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options?.limit || 10)));
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM payments) + (SELECT COUNT(*) FROM farmer_subscriptions) AS total`
  );
  const total = Number((countRows as any[])[0]?.total || 0);

  const [rows] = await pool.query(
    `(
       SELECT p.id, 'vet_service' AS type, p.farmer_id, f.full_name AS farmer_name,
              p.amount, p.status, COALESCE(sr.animal_or_crop_type, 'Vet Service') AS description,
              p.created_at, p.completed_at
       FROM payments p
       JOIN farmers f ON f.id = p.farmer_id
       LEFT JOIN service_requests sr ON sr.id = p.request_id
     )
     UNION ALL
     (
       SELECT fs.id, 'subscription' AS type, fs.farmer_id, f.full_name AS farmer_name,
              fs.amount,
              CASE WHEN fs.status = 'active' THEN 'success'
                   WHEN fs.status = 'cancelled' THEN 'failed'
                   ELSE fs.status END AS status,
              COALESCE(sp.name, 'Subscription') AS description,
              fs.created_at, fs.start_date AS completed_at
       FROM farmer_subscriptions fs
       JOIN farmers f ON f.id = fs.farmer_id
       LEFT JOIN subscription_packages sp ON sp.id = fs.package_id
     )
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const items = (rows as any[]).map((r) => ({
    id: r.id,
    type: r.type as 'vet_service' | 'subscription',
    farmerId: r.farmer_id,
    farmerName: r.farmer_name,
    amount: Number(r.amount),
    status: r.status,
    description: r.description,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? null,
  }));

  const totalPages = Math.ceil(total / limit) || 1;
  return { items, total, page, limit, totalPages };
}

