import { pool } from '../config/db';
import { newId } from './id';

export interface FarmerSubscription {
  id: string;
  farmerId: string;
  packageId: string;
  amount: number;
  durationDays: number;
  startDate: Date | null;
  endDate: Date | null;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  checkoutRequestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FarmerSubscriptionWithDetails extends FarmerSubscription {
  packageName: string;
  packageDescription: string;
  farmerName?: string;
  farmerPhone?: string;
}

function mapRow(row: any): FarmerSubscription {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    packageId: row.package_id,
    amount: Number(row.amount),
    durationDays: Number(row.duration_days),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    checkoutRequestId: row.checkout_request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(data: {
  farmerId: string;
  packageId: string;
  amount: number;
  durationDays: number;
  checkoutRequestId: string;
}): Promise<FarmerSubscription> {
  const id = newId();
  await pool.query(
    `INSERT INTO farmer_subscriptions (id, farmer_id, package_id, amount, duration_days, status, checkout_request_id)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [id, data.farmerId, data.packageId, data.amount, data.durationDays, data.checkoutRequestId]
  );
  return (await findById(id))!;
}

export async function findById(id: string): Promise<FarmerSubscription | null> {
  const [rows] = await pool.query('SELECT * FROM farmer_subscriptions WHERE id = ?', [id]);
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

export async function findByCheckoutRequestId(checkoutRequestId: string): Promise<FarmerSubscription | null> {
  const [rows] = await pool.query(
    'SELECT * FROM farmer_subscriptions WHERE checkout_request_id = ?',
    [checkoutRequestId]
  );
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

/**
 * Automatically update status of any active subscriptions that have passed their end_date to 'expired'.
 */
async function updateExpiredSubscriptions(): Promise<void> {
  await pool.query(
    "UPDATE farmer_subscriptions SET status = 'expired' WHERE status = 'active' AND end_date IS NOT NULL AND end_date < NOW()"
  );
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
): Promise<PaginatedResult<FarmerSubscriptionWithDetails>> {
  await updateExpiredSubscriptions();

  const page = Math.max(1, Number(options?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options?.limit || 10)));
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM farmer_subscriptions WHERE farmer_id = ?',
    [farmerId]
  );
  const total = Number((countRows as any[])[0]?.total || 0);

  const [rows] = await pool.query(
    `SELECT fs.*, sp.name AS package_name, sp.description AS package_description
     FROM farmer_subscriptions fs
     JOIN subscription_packages sp ON sp.id = fs.package_id
     WHERE fs.farmer_id = ?
     ORDER BY fs.created_at DESC
     LIMIT ? OFFSET ?`,
    [farmerId, limit, offset]
  );

  const items = (rows as any[]).map((r) => ({
    ...mapRow(r),
    packageName: r.package_name,
    packageDescription: r.package_description,
  }));
  const totalPages = Math.ceil(total / limit) || 1;

  return { items, total, page, limit, totalPages };
}

export async function listAllWithDetails(
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<FarmerSubscriptionWithDetails>> {
  await updateExpiredSubscriptions();

  const page = Math.max(1, Number(options?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options?.limit || 10)));
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM farmer_subscriptions');
  const total = Number((countRows as any[])[0]?.total || 0);

  const [rows] = await pool.query(
    `SELECT fs.*,
            sp.name AS package_name,
            sp.description AS package_description,
            f.full_name AS farmer_name,
            f.phone AS farmer_phone
     FROM farmer_subscriptions fs
     JOIN subscription_packages sp ON sp.id = fs.package_id
     JOIN farmers f ON f.id = fs.farmer_id
     ORDER BY fs.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const items = (rows as any[]).map((r) => ({
    ...mapRow(r),
    packageName: r.package_name,
    packageDescription: r.package_description,
    farmerName: r.farmer_name,
    farmerPhone: r.farmer_phone,
  }));
  const totalPages = Math.ceil(total / limit) || 1;

  return { items, total, page, limit, totalPages };
}

export async function activateSubscription(
  subscriptionId: string,
  success: boolean
): Promise<FarmerSubscription> {
  if (!success) {
    await pool.query(
      "UPDATE farmer_subscriptions SET status = 'cancelled' WHERE id = ?",
      [subscriptionId]
    );
    return (await findById(subscriptionId))!;
  }

  // Check if farmer already has an unexpired active subscription for this package to calculate renewal extension
  const existingSub = await findById(subscriptionId);
  let now = new Date();
  let baseDate = now;

  if (existingSub) {
    const [latestActive] = await pool.query(
      `SELECT * FROM farmer_subscriptions
       WHERE farmer_id = ? AND package_id = ? AND status = 'active' AND end_date > NOW() AND id != ?
       ORDER BY end_date DESC LIMIT 1`,
      [existingSub.farmerId, existingSub.packageId, subscriptionId]
    );
    const prev = (latestActive as any[])[0];
    if (prev && prev.end_date && new Date(prev.end_date) > now) {
      baseDate = new Date(prev.end_date);
    }
  }

  const durationDays = existingSub ? existingSub.durationDays : 30;
  const endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await pool.query(
    `UPDATE farmer_subscriptions
     SET status = 'active', start_date = ?, end_date = ?
     WHERE id = ?`,
    [now, endDate, subscriptionId]
  );

  return (await findById(subscriptionId))!;
}
