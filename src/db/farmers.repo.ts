import { pool } from '../config/db';
import { newId } from './id';

export interface Farmer {
  id: string;
  fullName: string;
  idNumber: string;
  phone: string;
  county: string;
  subCounty: string;
  createdAt: Date;
}

function mapRow(row: any): Farmer {
  return {
    id: row.id,
    fullName: row.full_name,
    idNumber: row.id_number,
    phone: row.phone,
    county: row.county,
    subCounty: row.sub_county,
    createdAt: row.created_at,
  };
}

export async function findById(id: string): Promise<Farmer | null> {
  const [rows] = await pool.query('SELECT * FROM farmers WHERE id = ?', [id]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function findByPhoneAndIdNumber(phone: string, idNumber: string): Promise<Farmer | null> {
  const [rows] = await pool.query('SELECT * FROM farmers WHERE phone = ? AND id_number = ?', [phone, idNumber]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function findByIdNumberOrPhone(idNumber: string, phone: string): Promise<Farmer | null> {
  const [rows] = await pool.query(
    'SELECT * FROM farmers WHERE id_number = ? OR phone = ? LIMIT 1',
    [idNumber, phone]
  );
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function create(data: {
  fullName: string; idNumber: string; phone: string; county: string; subCounty: string;
}): Promise<Farmer> {
  const id = newId();
  await pool.query(
    'INSERT INTO farmers (id, full_name, id_number, phone, county, sub_county) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.fullName, data.idNumber, data.phone, data.county, data.subCounty]
  );
  return (await findById(id))!;
}

export async function count(): Promise<number> {
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM farmers');
  return Number((rows as any[])[0].c);
}

export async function listAll(): Promise<Farmer[]> {
  const [rows] = await pool.query('SELECT * FROM farmers ORDER BY created_at DESC');
  return (rows as any[]).map(mapRow);
}
