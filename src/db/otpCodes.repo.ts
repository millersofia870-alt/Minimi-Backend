import { pool } from '../config/db';
import { newId } from './id';

export async function create(data: { userId: string; userRole: 'farmer' | 'vet'; codeHash: string; expiresAt: Date }) {
  const id = newId();
  await pool.query(
    'INSERT INTO otp_codes (id, user_id, user_role, code_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
    [id, data.userId, data.userRole, data.codeHash, data.expiresAt]
  );
  return id;
}

export async function findValid(userId: string, userRole: 'farmer' | 'vet', codeHash: string) {
  const [rows] = await pool.query(
    `SELECT * FROM otp_codes
     WHERE user_id = ? AND user_role = ? AND code_hash = ? AND consumed = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, userRole, codeHash]
  );
  return (rows as any[])[0] ?? null;
}

export async function markConsumed(id: string) {
  await pool.query('UPDATE otp_codes SET consumed = TRUE WHERE id = ?', [id]);
}
