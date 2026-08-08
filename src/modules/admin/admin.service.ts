import * as farmers from '../../db/farmers.repo';
import * as vets from '../../db/vets.repo';
import * as serviceRequests from '../../db/serviceRequests.repo';
import * as captureImages from '../../db/captureImages.repo';
import * as payments from '../../db/payments.repo';
import * as wallets from '../../db/wallets.repo';
import { AppError } from '../../utils/AppError';
import { notifyUser } from '../../sockets/notify';

export async function getDashboardSummary() {
  const [totalFarmers, totalVets] = await Promise.all([farmers.count(), vets.count()]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalAmountToday, totalEarnings, depositStats] = await Promise.all([
    payments.sumSuccessSince(startOfToday),
    payments.sumSuccessAllTime(),
    wallets.getDepositStats(),
  ]);

  return { totalFarmers, totalVets, totalAmountToday, totalEarnings, depositStats };
}

export async function getTopVets(limit = 10) {
  const grouped = await serviceRequests.groupCompletedCountByVet(limit);
  const vetRecords = await vets.findByIds(grouped.map((g) => g.vetId));
  const vetById = new Map(vetRecords.map((v) => [v.id, v]));

  return grouped.map((g) => ({
    vetId: g.vetId,
    fullName: vetById.get(g.vetId)?.fullName ?? 'Unknown',
    completedRequests: g.completedRequests,
  }));
}

export async function getRequestsByCounty() {
  return serviceRequests.groupCountByCounty();
}

export async function getEarningsPerVet(from?: Date, to?: Date) {
  const totals = await payments.earningsPerVet(from, to);
  const vetRecords = await vets.findByIds(totals.map((t) => t.vetId));
  const vetById = new Map(vetRecords.map((v) => [v.id, v]));

  return totals
    .map((t) => ({ vetId: t.vetId, fullName: vetById.get(t.vetId)?.fullName ?? 'Unknown', total: t.total }))
    .sort((a, b) => b.total - a.total);
}

export async function getEarningsByCounty(from?: Date, to?: Date) {
  const totals = await payments.earningsByCounty(from, to);
  return totals.sort((a, b) => b.total - a.total);
}

export async function listVets(status?: string) {
  return vets.listByStatus(status);
}

export async function setVetStatus(vetId: string, status: 'approved' | 'suspended' | 'pending_verification') {
  const vet = await vets.setStatus(vetId, status);
  notifyUser('vet', vetId, 'vet_status_updated', { status: vet.status, vetId: vet.id });
  return vet;
}

export async function listFarmers() {
  return farmers.listAll();
}

export async function listRequests(filters: { status?: string; county?: string }) {
  return serviceRequests.listFiltered(filters);
}

export async function getRequestDetails(requestId: string) {
  const request = await serviceRequests.findByIdWithDetails(requestId);
  if (!request) throw new AppError('Request not found', 404);
  const images = await captureImages.listByRequest(requestId);
  return { request, images };
}

export async function getRevenueByCounty(from?: Date, to?: Date) {
  return payments.earningsByCountyWithSubscriptions(from, to);
}

export async function getAllPayments(options?: { page?: number; limit?: number }) {
  return payments.listAllPaymentsAdmin(options);
}

export async function getDepositStats() {
  return wallets.getDepositStats();
}

export async function listDeposits(filters: { status?: string; farmerId?: string; page?: number; limit?: number }) {
  return wallets.listDeposits(filters);
}
