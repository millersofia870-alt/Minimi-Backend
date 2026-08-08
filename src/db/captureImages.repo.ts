import { pool } from '../config/db';
import { newId } from './id';

export interface CaptureImage {
  id: string;
  requestId: string;
  vetId: string;
  farmerId: string;
  imageUrl: string;
  type: 'livestock' | 'crop';
  notes: string | null;
  capturedAt: Date;
}

function mapRow(row: any): CaptureImage {
  return {
    id: row.id,
    requestId: row.request_id,
    vetId: row.vet_id,
    farmerId: row.farmer_id,
    imageUrl: row.image_url,
    type: row.type,
    notes: row.notes,
    capturedAt: row.captured_at,
  };
}

export async function create(data: {
  requestId: string; vetId: string; farmerId: string; imageUrl: string; type: 'livestock' | 'crop'; notes?: string;
}): Promise<CaptureImage> {
  const id = newId();
  await pool.query(
    'INSERT INTO capture_images (id, request_id, vet_id, farmer_id, image_url, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.requestId, data.vetId, data.farmerId, data.imageUrl, data.type, data.notes ?? null]
  );
  const [rows] = await pool.query('SELECT * FROM capture_images WHERE id = ?', [id]);
  return mapRow((rows as any[])[0]);
}

export async function listByRequest(requestId: string): Promise<CaptureImage[]> {
  const [rows] = await pool.query(
    'SELECT * FROM capture_images WHERE request_id = ? ORDER BY captured_at DESC',
    [requestId]
  );
  return (rows as any[]).map(mapRow);
}
