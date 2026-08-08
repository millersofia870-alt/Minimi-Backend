import { pool } from '../config/db';
import { newId } from './id';

export interface Vet {
  id: string;
  fullName: string;
  idNumber: string;
  phone: string;
  county: string;
  subCounty: string;
  status: 'pending_verification' | 'approved' | 'suspended';
  rating: number | null;
  profileImageUrl: string | null;
  createdAt: Date;
}

function mapRow(row: any): Vet {
  return {
    id: row.id,
    fullName: row.full_name,
    idNumber: row.id_number,
    phone: row.phone,
    county: row.county,
    subCounty: row.sub_county,
    status: row.status,
    rating: row.rating,
    profileImageUrl: row.profile_image_url ?? null,
    createdAt: row.created_at,
  };
}

export async function setProfileImage(id: string, profileImageUrl: string): Promise<Vet> {
  await pool.query('UPDATE vets SET profile_image_url = ? WHERE id = ?', [profileImageUrl, id]);
  return (await findById(id))!;
}

export async function findById(id: string): Promise<Vet | null> {
  const [rows] = await pool.query('SELECT * FROM vets WHERE id = ?', [id]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function findByPhoneAndIdNumber(phone: string, idNumber: string): Promise<Vet | null> {
  const [rows] = await pool.query('SELECT * FROM vets WHERE phone = ? AND id_number = ?', [phone, idNumber]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function findByIdNumberOrPhone(idNumber: string, phone: string): Promise<Vet | null> {
  const [rows] = await pool.query(
    'SELECT * FROM vets WHERE id_number = ? OR phone = ? LIMIT 1',
    [idNumber, phone]
  );
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function create(data: {
  fullName: string; idNumber: string; phone: string; county: string; subCounty: string;
}): Promise<Vet> {
  const id = newId();
  await pool.query(
    `INSERT INTO vets (id, full_name, id_number, phone, county, sub_county, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending_verification')`,
    [id, data.fullName, data.idNumber, data.phone, data.county, data.subCounty]
  );
  return (await findById(id))!;
}

export async function setStatus(id: string, status: Vet['status']): Promise<Vet> {
  await pool.query('UPDATE vets SET status = ? WHERE id = ?', [status, id]);
  return (await findById(id))!;
}

export async function count(): Promise<number> {
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM vets');
  return Number((rows as any[])[0].c);
}

export async function listByStatus(status?: string): Promise<Vet[]> {
  const [rows] = status
    ? await pool.query('SELECT * FROM vets WHERE status = ? ORDER BY created_at DESC', [status])
    : await pool.query('SELECT * FROM vets ORDER BY created_at DESC');
  return (rows as any[]).map(mapRow);
}

export async function listApprovedNearby(county: string, subCounty?: string): Promise<Vet[]> {
  const [rows] = subCounty
    ? await pool.query(
        "SELECT * FROM vets WHERE status = 'approved' AND county = ? AND sub_county = ? ORDER BY rating DESC",
        [county, subCounty]
      )
    : await pool.query("SELECT * FROM vets WHERE status = 'approved' AND county = ? ORDER BY rating DESC", [county]);
  return (rows as any[]).map(mapRow);
}

export async function findByIds(ids: string[]): Promise<Vet[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT * FROM vets WHERE id IN (${placeholders})`, ids);
  return (rows as any[]).map(mapRow);
}
