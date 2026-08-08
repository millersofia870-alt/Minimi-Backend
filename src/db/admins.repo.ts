import { pool } from '../config/db';
import { newId } from './id';

export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

function mapRow(row: any): Admin {
  return { id: row.id, username: row.username, passwordHash: row.password_hash, createdAt: row.created_at };
}

export async function findByUsername(username: string): Promise<Admin | null> {
  const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function create(username: string, passwordHash: string): Promise<Admin> {
  const id = newId();
  await pool.query('INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)', [id, username, passwordHash]);
  return { id, username, passwordHash, createdAt: new Date() };
}
