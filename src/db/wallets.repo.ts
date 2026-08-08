import { pool } from '../config/db';
import { newId } from './id';
import * as serviceRequests from './serviceRequests.repo';

export type WalletRole = 'farmer' | 'vet';
export type DbExecutor = { query: (sql: string, values?: any[]) => Promise<any> };

function wallet(row: any) { return { id: row.id, ownerId: row.owner_id, ownerRole: row.owner_role as WalletRole, balance: Number(row.balance), createdAt: row.created_at, updatedAt: row.updated_at }; }
function transaction(row: any) { return { id: row.id, walletId: row.wallet_id, type: row.type, amount: Number(row.amount), status: row.status, requestId: row.request_id, paymentRequestId: row.payment_request_id, checkoutRequestId: row.checkout_request_id, mpesaReceiptNumber: row.mpesa_receipt_number, description: row.description, createdAt: row.created_at, completedAt: row.completed_at }; }
function paymentRequest(row: any) { return { id: row.id, requestId: row.request_id, farmerId: row.farmer_id, vetId: row.vet_id, amount: Number(row.amount), status: row.status, createdAt: row.created_at, respondedAt: row.responded_at }; }

export async function getOrCreate(ownerId: string, ownerRole: WalletRole, db: DbExecutor = pool) {
  await db.query('INSERT IGNORE INTO wallets (id, owner_id, owner_role) VALUES (?, ?, ?)', [newId(), ownerId, ownerRole]);
  const [rows] = await db.query('SELECT * FROM wallets WHERE owner_id = ? AND owner_role = ?', [ownerId, ownerRole]);
  return wallet(rows[0]);
}
export async function findForUpdate(ownerId: string, ownerRole: WalletRole, db: DbExecutor) {
  const [rows] = await db.query('SELECT * FROM wallets WHERE owner_id = ? AND owner_role = ? FOR UPDATE', [ownerId, ownerRole]);
  return rows[0] ? wallet(rows[0]) : null;
}
export async function createDeposit(ownerId: string, amount: number, checkoutRequestId: string) {
  const w = await getOrCreate(ownerId, 'farmer'); const id = newId();
  await pool.query("INSERT INTO wallet_transactions (id, wallet_id, type, amount, status, checkout_request_id, description) VALUES (?, ?, 'deposit', ?, 'pending', ?, 'Wallet deposit')", [id, w.id, amount, checkoutRequestId]);
  return findTransactionById(id);
}
export async function findTransactionByCheckout(checkoutRequestId: string) { const [rows] = await pool.query('SELECT * FROM wallet_transactions WHERE checkout_request_id = ?', [checkoutRequestId]); const result = rows as any[]; return result[0] ? transaction(result[0]) : null; }
export async function findTransactionById(id: string) { const [rows] = await pool.query('SELECT * FROM wallet_transactions WHERE id = ?', [id]); const result = rows as any[]; return result[0] ? transaction(result[0]) : null; }
export async function completeDeposit(checkoutRequestId: string, success: boolean, receipt?: string) {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const [rows] = await conn.query('SELECT * FROM wallet_transactions WHERE checkout_request_id = ? FOR UPDATE', [checkoutRequestId]); const result = rows as any[]; const tx = result[0] && transaction(result[0]); if (!tx) return null; if (tx.status !== 'pending') { await conn.commit(); return tx; }
    if (success) { await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [tx.amount, tx.walletId]); await conn.query("UPDATE wallet_transactions SET status='success', mpesa_receipt_number=?, completed_at=NOW() WHERE id=?", [receipt ?? null, tx.id]); }
    else await conn.query("UPDATE wallet_transactions SET status='failed', completed_at=NOW() WHERE id=?", [tx.id]);
    await conn.commit(); return findTransactionById(tx.id);
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
export async function list(ownerId: string, ownerRole: WalletRole, page = 1, limit = 20) { const w = await getOrCreate(ownerId, ownerRole); const safeLimit = Math.min(100, Math.max(1, limit)); const offset = Math.max(0, page - 1) * safeLimit; const [count] = await pool.query('SELECT COUNT(*) total FROM wallet_transactions WHERE wallet_id=?', [w.id]); const [rows] = await pool.query('SELECT * FROM wallet_transactions WHERE wallet_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?', [w.id, safeLimit, offset]); const totals = count as any[]; return { wallet: w, transactions: (rows as any[]).map(transaction), total: Number(totals[0].total) }; }
export async function createPaymentRequest(requestId: string, farmerId: string, vetId: string, amount: number) {
  const request = await serviceRequests.findById(requestId);
  if (!request) throw new Error('Service request not found');
  if (request.paidAt) throw new Error('This service request has already been paid');
  const id = newId();
  await pool.query("INSERT INTO wallet_payment_requests (id, request_id, farmer_id, vet_id, amount, status) VALUES (?, ?, ?, ?, ?, 'pending')", [id, requestId, farmerId, vetId, amount]);
  const [rows] = await pool.query('SELECT * FROM wallet_payment_requests WHERE id=?', [id]);
  return paymentRequest((rows as any[])[0]);
}
export async function listPaymentRequests(ownerId: string, role: WalletRole) {
  const col = role === 'farmer' ? 'farmer_id' : 'vet_id';
  const [rows] = await pool.query(`SELECT wpr.*, sr.animal_or_crop_type, v.full_name vet_name, f.full_name farmer_name, sr.paid_at FROM wallet_payment_requests wpr JOIN service_requests sr ON sr.id=wpr.request_id JOIN vets v ON v.id=wpr.vet_id JOIN farmers f ON f.id=wpr.farmer_id WHERE wpr.${col}=? ORDER BY wpr.created_at DESC`, [ownerId]);
  return (rows as any[]).map((r: any) => ({ ...paymentRequest(r), animalOrCropType: r.animal_or_crop_type, vetName: r.vet_name, farmerName: r.farmer_name, paidAt: r.paid_at ?? null }));
}
export async function payPaymentRequest(paymentRequestId: string, farmerId: string) {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const [requests] = await conn.query('SELECT * FROM wallet_payment_requests WHERE id=? FOR UPDATE', [paymentRequestId]); const paymentRequests = requests as any[]; const pr = paymentRequests[0] && paymentRequest(paymentRequests[0]); if (!pr) throw new Error('Wallet payment request not found'); if (pr.farmerId !== farmerId) throw new Error('Forbidden'); if (pr.status !== 'pending') throw new Error('This wallet payment request has already been resolved');
    const request = await serviceRequests.findById(pr.requestId);
    if (!request) throw new Error('Service request not found');
    if (request.paidAt) throw new Error('This service request has already been paid through M-Pesa');
    await getOrCreate(pr.farmerId, 'farmer', conn); await getOrCreate(pr.vetId, 'vet', conn); const fw = await findForUpdate(pr.farmerId, 'farmer', conn); const vw = await findForUpdate(pr.vetId, 'vet', conn); if (!fw || !vw) throw new Error('Wallet not found'); if (fw.balance < pr.amount) throw new Error('Insufficient wallet balance');
    await conn.query('UPDATE wallets SET balance=balance-? WHERE id=?', [pr.amount, fw.id]); await conn.query('UPDATE wallets SET balance=balance+? WHERE id=?', [pr.amount, vw.id]); await conn.query("UPDATE wallet_payment_requests SET status='paid', responded_at=NOW() WHERE id=?", [pr.id]);
    await conn.query("INSERT INTO wallet_transactions (id,wallet_id,type,amount,status,request_id,payment_request_id,description,completed_at) VALUES (?,?,'service_debit',?,'success',?,?,'Wallet payment to vet',NOW())", [newId(), fw.id, pr.amount, pr.requestId, pr.id]);
    await conn.query("INSERT INTO wallet_transactions (id,wallet_id,type,amount,status,request_id,payment_request_id,description,completed_at) VALUES (?,?,'service_credit',?,'success',?,?,'Wallet payment from farmer',NOW())", [newId(), vw.id, pr.amount, pr.requestId, pr.id]);
    await serviceRequests.markPaid(pr.requestId);
    await conn.commit();
    const newBalance = fw.balance - pr.amount;
    return { paymentRequest: { ...pr, status: 'paid' }, amountPaid: pr.amount, newBalance };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
export async function rejectPaymentRequest(paymentRequestId: string, farmerId: string) { const [result] = await pool.query("UPDATE wallet_payment_requests SET status='rejected', responded_at=NOW() WHERE id=? AND farmer_id=? AND status='pending'", [paymentRequestId, farmerId]); return (result as any).affectedRows > 0; }

export interface Deposit extends ReturnType<typeof transaction> {
  farmerId: string;
}

export async function listDeposits(filters: { status?: string; farmerId?: string; page?: number; limit?: number }): Promise<{ items: Deposit[]; total: number; page: number; limit: number; totalPages: number }> {
  const clauses: string[] = ["wt.type = 'deposit'"];
  const params: any[] = [];

  if (filters.status) { clauses.push('wt.status = ?'); params.push(filters.status); }
  if (filters.farmerId) { clauses.push('w.owner_id = ? AND w.owner_role = ?'); params.push(filters.farmerId, 'farmer'); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 10)));
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id ${where}`, params);
  const [rows] = await pool.query(`SELECT wt.*, w.owner_id AS farmer_id FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id ${where} ORDER BY wt.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

  return {
    items: (rows as any[]).map((r) => ({ ...transaction(r), farmerId: r.farmer_id })),
    total: Number((countRows as any[])[0].total),
    page,
    limit,
    totalPages: Math.ceil(Number((countRows as any[])[0].total) / limit) || 1,
  };
}

export async function getDepositStats() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [rows] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount END), 0) AS totalDeposit,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND created_at >= ? THEN amount END), 0) AS todayDeposit,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'success' THEN amount END), 0) AS completedDeposit,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'failed' THEN amount END), 0) AS failedDeposit,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'success' AND created_at >= ? THEN amount END), 0) AS todayCompleted,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'failed' AND created_at >= ? THEN amount END), 0) AS todayFailed
       FROM wallet_transactions`,
      [startOfToday, startOfToday, startOfToday]
    );

    const r = (rows as any[])[0] || {};
    return {
      totalDeposit: Number(r.totalDeposit) || 0,
      todayDeposit: Number(r.todayDeposit) || 0,
      completedDeposit: Number(r.completedDeposit) || 0,
      failedDeposit: Number(r.failedDeposit) || 0,
      todayCompleted: Number(r.todayCompleted) || 0,
      todayFailed: Number(r.todayFailed) || 0,
    };
  } catch (error) {
    console.error('[Wallets] getDepositStats failed:', error);
    return {
      totalDeposit: 0,
      todayDeposit: 0,
      completedDeposit: 0,
      failedDeposit: 0,
      todayCompleted: 0,
      todayFailed: 0,
    };
  }
}
