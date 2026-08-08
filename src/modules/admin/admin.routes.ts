import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import { paginate } from '../../utils/pagination';
import { adminRateLimiter } from '../../middleware/rateLimiter';
import * as admin from './admin.service';
import * as vets from '../../db/vets.repo';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'), adminRateLimiter);

adminRouter.get('/dashboard/summary', asyncHandler(async (req, res) => {
  res.json(await admin.getDashboardSummary());
}));

adminRouter.get('/dashboard/top-vets', asyncHandler(async (req, res) => {
  const vets = await admin.getTopVets();
  const result = paginate(vets, req.query);
  res.json({ vets: result.items, pagination: result.pagination });
}));

adminRouter.get('/dashboard/requests-by-county', asyncHandler(async (req, res) => {
  const counties = await admin.getRequestsByCounty();
  const result = paginate(counties, req.query);
  res.json({ counties: result.items, pagination: result.pagination });
}));

const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

adminRouter.get('/reports/earnings-per-vet', asyncHandler(async (req, res) => {
  const { from, to } = dateRangeSchema.parse(req.query);
  const report = await admin.getEarningsPerVet(from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  res.json({ report });
}));

adminRouter.get('/reports/earnings-by-county', asyncHandler(async (req, res) => {
  const { from, to } = dateRangeSchema.parse(req.query);
  const report = await admin.getEarningsByCounty(from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  res.json({ report });
}));

adminRouter.get('/vets', asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const vets = await admin.listVets(status);
  const result = paginate(vets, req.query);
  res.json({ vets: result.items, pagination: result.pagination });
}));

adminRouter.get('/vets/:id', asyncHandler(async (req, res) => {
  const vet = await vets.findById(req.params.id);
  if (!vet) { res.status(404).json({ error: 'Vet not found' }); return; }
  res.json({ vet });
}));

const setStatusSchema = z.object({ status: z.enum(['approved', 'suspended', 'pending_verification']) });
adminRouter.patch('/vets/:id/status', asyncHandler(async (req, res) => {
  const { status } = setStatusSchema.parse(req.body);
  const vet = await admin.setVetStatus(req.params.id, status);
  res.json({ vet });
}));

adminRouter.get('/farmers', asyncHandler(async (req, res) => {
  const farmers = await admin.listFarmers();
  const result = paginate(farmers, req.query);
  res.json({ farmers: result.items, pagination: result.pagination });
}));

adminRouter.get('/service-requests', asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const county = typeof req.query.county === 'string' ? req.query.county : undefined;
  const requests = await admin.listRequests({ status, county });
  const result = paginate(requests, req.query);
  res.json({ requests: result.items, pagination: result.pagination });
}));

adminRouter.get('/service-requests/:id', asyncHandler(async (req, res) => {
  const details = await admin.getRequestDetails(req.params.id);
  res.json(details);
}));

adminRouter.get('/reports/revenue-by-county', asyncHandler(async (req, res) => {
  const { from, to } = dateRangeSchema.parse(req.query);
  const report = await admin.getRevenueByCounty(from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  res.json({ report });
}));

adminRouter.get('/payments/all', asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const result = await admin.getAllPayments({ page, limit });
  res.json({ payments: result.items, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
}));

const depositFiltersSchema = z.object({
  status: z.enum(['pending', 'success', 'failed']).optional(),
  farmerId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

adminRouter.get('/deposits/stats', asyncHandler(async (req, res) => {
  const stats = await admin.getDepositStats();
  res.json(stats);
}));

adminRouter.get('/deposits', asyncHandler(async (req, res) => {
  const filters = depositFiltersSchema.parse(req.query);
  const result = await admin.listDeposits(filters);
  res.json({ deposits: result.items, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
}));
