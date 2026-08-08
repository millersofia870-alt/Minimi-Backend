import { pool } from '../config/db';
import { newId } from './id';

export async function create(data: { userId: string; userRole: 'farmer' | 'vet' | 'admin'; tokenHash: string; expiresAt: Date }) {
  const id = newId();
  await pool.query(
    'INSERT INTO refresh_tokens (id, user_id, user_role, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
    [id, data.userId, data.userRole, data.tokenHash, data.expiresAt]
  );
  return id;
}

export async function findByHash(tokenHash: string) {
  const [rows] = await pool.query('SELECT * FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
  const r = (rows as any[])[0];
  if (!r) return null;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    userRole: r.user_role as 'farmer' | 'vet' | 'admin',
    tokenHash: r.token_hash as string,
    expiresAt: r.expires_at as Date,
    revoked: !!r.revoked,
  };
}

export async function revokeById(id: string) {
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?', [id]);
}

export async function revokeByHash(tokenHash: string) {
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [tokenHash]);
}
