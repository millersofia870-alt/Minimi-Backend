import { pool } from '../config/db';
import { newId } from './id';

export interface ServiceRequest {
  id: string;
  farmerId: string;
  vetId: string | null;
  county: string;
  subCounty: string;
  description: string;
  animalOrCropType: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: Date;
  acceptedAt: Date | null;
  completedAt: Date | null;
  paidAt: Date | null;
  serviceFee: number | null;
  feeStatus: 'not_set' | 'pending_approval' | 'approved';
}

function mapRow(row: any): ServiceRequest {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    vetId: row.vet_id,
    county: row.county,
    subCounty: row.sub_county,
    description: row.description,
    animalOrCropType: row.animal_or_crop_type,
    status: row.status,
    requestedAt: row.requested_at,
    acceptedAt: row.accepted_at,
    completedAt: row.completed_at,
    paidAt: row.paid_at,
    serviceFee: row.service_fee ? Number(row.service_fee) : null,
    feeStatus: row.fee_status ?? 'not_set',
  };
}

export async function findById(id: string): Promise<ServiceRequest | null> {
  const [rows] = await pool.query('SELECT * FROM service_requests WHERE id = ?', [id]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function findByIdWithDetails(id: string): Promise<(ServiceRequest & { farmerName: string; farmerPhone: string; vetName: string | null }) | null> {
  const [rows] = await pool.query(
    `SELECT sr.*, f.full_name AS farmer_name, f.phone AS farmer_phone, v.full_name AS vet_name
     FROM service_requests sr
     JOIN farmers f ON f.id = sr.farmer_id
     LEFT JOIN vets v ON v.id = sr.vet_id
     WHERE sr.id = ?`,
    [id]
  );
  const r = (rows as any[])[0];
  if (!r) return null;
  return { ...mapRow(r), farmerName: r.farmer_name, farmerPhone: r.farmer_phone, vetName: r.vet_name ?? null };
}

export async function create(data: {
  farmerId: string; vetId?: string | null; county: string; subCounty: string;
  description: string; animalOrCropType: string;
}): Promise<ServiceRequest> {
  const id = newId();
  await pool.query(
    `INSERT INTO service_requests (id, farmer_id, vet_id, county, sub_county, description, animal_or_crop_type, status, service_fee, fee_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, 'not_set')`,
    [id, data.farmerId, data.vetId ?? null, data.county, data.subCounty, data.description, data.animalOrCropType]
  );
  return (await findById(id))!;
}

export async function listByFarmer(farmerId: string): Promise<ServiceRequest[]> {
  const [rows] = await pool.query(
    `SELECT sr.*, f.full_name AS farmer_name, v.full_name AS vet_name
     FROM service_requests sr
     JOIN farmers f ON f.id = sr.farmer_id
     LEFT JOIN vets v ON v.id = sr.vet_id
     WHERE sr.farmer_id = ?
     ORDER BY sr.requested_at DESC`,
    [farmerId]
  );
  return (rows as any[]).map((r) => ({ ...mapRow(r), farmerName: r.farmer_name, vetName: r.vet_name ?? null }));
}

export async function accept(id: string, vetId: string): Promise<ServiceRequest> {
  await pool.query(
    "UPDATE service_requests SET vet_id = ?, status = 'accepted', accepted_at = NOW() WHERE id = ?",
    [vetId, id]
  );
  return (await findById(id))!;
}

export async function complete(id: string): Promise<ServiceRequest> {
  await pool.query("UPDATE service_requests SET status = 'completed', completed_at = NOW() WHERE id = ?", [id]);
  return (await findById(id))!;
}

export async function setFee(id: string, amount: number, feeStatus: 'pending_approval' | 'approved'): Promise<ServiceRequest> {
  await pool.query('UPDATE service_requests SET service_fee = ?, fee_status = ? WHERE id = ?', [amount, feeStatus, id]);
  return (await findById(id))!;
}

export async function markPaid(id: string): Promise<ServiceRequest> {
  await pool.query("UPDATE service_requests SET paid_at = NOW(), status = 'completed' WHERE id = ?", [id]);
  return (await findById(id))!;
}

export async function listFiltered(filters: { status?: string; county?: string }): Promise<any[]> {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.status) { clauses.push('sr.status = ?'); params.push(filters.status); }
  if (filters.county) { clauses.push('sr.county = ?'); params.push(filters.county); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT sr.*, f.full_name AS farmer_name, v.full_name AS vet_name
     FROM service_requests sr
     JOIN farmers f ON f.id = sr.farmer_id
     LEFT JOIN vets v ON v.id = sr.vet_id
     ${where}
     ORDER BY sr.requested_at DESC`,
    params
  );

  return (rows as any[]).map((r) => ({ ...mapRow(r), farmerName: r.farmer_name, vetName: r.vet_name }));
}

export async function groupCountByCounty(): Promise<{ county: string; count: number }[]> {
  const [rows] = await pool.query(
    'SELECT county, COUNT(*) AS count FROM service_requests GROUP BY county ORDER BY count DESC'
  );
  return (rows as any[]).map((r) => ({ county: r.county, count: Number(r.count) }));
}

export async function listForVet(vetId: string, county: string, subCounty: string, status?: string): Promise<any[]> {
  const clauses = ['(sr.vet_id = ? OR (sr.vet_id IS NULL AND sr.status = \'pending\' AND sr.county = ? AND sr.sub_county = ?))'];
  const params: any[] = [vetId, county, subCounty];
  if (status) { clauses.push('sr.status = ?'); params.push(status); }

  const [rows] = await pool.query(
    `SELECT sr.*, f.full_name AS farmer_name, f.phone AS farmer_phone
     FROM service_requests sr
     JOIN farmers f ON f.id = sr.farmer_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY sr.requested_at DESC`,
    params
  );

  return (rows as any[]).map((r) => ({ ...mapRow(r), farmerName: r.farmer_name, farmerPhone: r.farmer_phone }));
}

export async function listCompletedByVetWithEarnings(vetId: string): Promise<any[]> {
  const [rows] = await pool.query(
    `SELECT sr.*, COALESCE(SUM(CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END), 0) AS earned
     FROM service_requests sr
     LEFT JOIN payments p ON p.request_id = sr.id
     WHERE sr.vet_id = ? AND sr.status = 'completed'
     GROUP BY sr.id
     ORDER BY sr.completed_at DESC`,
    [vetId]
  );
  return (rows as any[]).map((r) => ({ ...mapRow(r), earned: Number(r.earned) }));
}

export async function groupCompletedCountByVet(limit = 10): Promise<{ vetId: string; completedRequests: number }[]> {
  const [rows] = await pool.query(
    `SELECT vet_id, COUNT(*) AS count FROM service_requests
     WHERE status = 'completed' AND vet_id IS NOT NULL
     GROUP BY vet_id ORDER BY count DESC LIMIT ?`,
    [limit]
  );
  return (rows as any[]).map((r) => ({ vetId: r.vet_id, completedRequests: Number(r.count) }));
}
