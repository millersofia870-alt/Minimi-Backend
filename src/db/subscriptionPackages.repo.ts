import { pool } from '../config/db';
import { newId } from './id';

export interface SubscriptionPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: any): SubscriptionPackage {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    durationDays: Number(row.duration_days),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(data: {
  name: string;
  description: string;
  price: number;
  durationDays: number;
}): Promise<SubscriptionPackage> {
  const id = newId();
  await pool.query(
    `INSERT INTO subscription_packages (id, name, description, price, duration_days, is_active)
     VALUES (?, ?, ?, ?, ?, TRUE)`,
    [id, data.name, data.description, data.price, data.durationDays]
  );
  return (await findById(id))!;
}

export async function findById(id: string): Promise<SubscriptionPackage | null> {
  const [rows] = await pool.query('SELECT * FROM subscription_packages WHERE id = ?', [id]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function listAll(): Promise<SubscriptionPackage[]> {
  const [rows] = await pool.query('SELECT * FROM subscription_packages ORDER BY created_at DESC');
  return (rows as any[]).map(mapRow);
}

export async function listActive(): Promise<SubscriptionPackage[]> {
  const [rows] = await pool.query(
    'SELECT * FROM subscription_packages WHERE is_active = TRUE ORDER BY price ASC'
  );
  return (rows as any[]).map(mapRow);
}

export async function update(
  id: string,
  data: Partial<{ name: string; description: string; price: number; durationDays: number; isActive: boolean }>
): Promise<SubscriptionPackage> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
  if (data.price !== undefined) { fields.push('price = ?'); params.push(data.price); }
  if (data.durationDays !== undefined) { fields.push('duration_days = ?'); params.push(data.durationDays); }
  if (data.isActive !== undefined) { fields.push('is_active = ?'); params.push(data.isActive); }

  if (fields.length > 0) {
    params.push(id);
    await pool.query(`UPDATE subscription_packages SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  return (await findById(id))!;
}

export async function deletePackage(id: string): Promise<void> {
  await pool.query('DELETE FROM subscription_packages WHERE id = ?', [id]);
}

export async function toggleActive(id: string, isActive?: boolean): Promise<SubscriptionPackage> {
  if (isActive !== undefined) {
    await pool.query('UPDATE subscription_packages SET is_active = ? WHERE id = ?', [isActive, id]);
  } else {
    await pool.query('UPDATE subscription_packages SET is_active = NOT is_active WHERE id = ?', [id]);
  }
  return (await findById(id))!;
}
