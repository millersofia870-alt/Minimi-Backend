import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireRole, AuthedRequest } from '../../middleware/auth';
import * as service from './subscriptions.service';

export const subscriptionsRouter = Router();

const createPackageSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  durationDays: z.number().int().positive().default(30),
});

const updatePackageSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  durationDays: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const subscribeStkSchema = z.object({
  packageId: z.string().min(1),
  phone: z.string().min(9),
});

// GET /api/subscriptions/packages — List packages (Farmer: active only, Admin: option for all)
subscriptionsRouter.get('/packages', asyncHandler(async (req, res) => {
  const includeDisabled = req.query.all === 'true';
  const packages = await service.getPackages(includeDisabled);
  res.json({ packages });
}));

// POST /api/subscriptions/packages — Admin create package
subscriptionsRouter.post('/packages', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const body = createPackageSchema.parse(req.body);
  const pkg = await service.createPackage(body);
  res.status(201).json({ package: pkg });
}));

// PATCH /api/subscriptions/packages/:id — Admin update package
subscriptionsRouter.patch('/packages/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const body = updatePackageSchema.parse(req.body);
  const pkg = await service.updatePackage(req.params.id, body);
  res.json({ package: pkg });
}));

// DELETE /api/subscriptions/packages/:id — Admin delete package
subscriptionsRouter.delete('/packages/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await service.deletePackage(req.params.id);
  res.json(result);
}));

// PATCH /api/subscriptions/packages/:id/toggle-active — Admin disable/enable package
subscriptionsRouter.patch('/packages/:id/toggle-active', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined;
  const pkg = await service.togglePackageActive(req.params.id, isActive);
  res.json({ package: pkg });
}));

// POST /api/subscriptions/subscribe-stk — Farmer subscribe / renew package via STK Push
subscriptionsRouter.post('/subscribe-stk', requireAuth, requireRole('farmer'), asyncHandler(async (req: AuthedRequest, res) => {
  const { packageId, phone } = subscribeStkSchema.parse(req.body);
  const result = await service.initiateSubscriptionStkPush(req.user!.id, packageId, phone);
  res.status(201).json(result);
}));

// GET /api/subscriptions/my or GET /api/farmer/subscriptions/my — Farmer get all their subscriptions
subscriptionsRouter.get(['/my', '/farmer/my'], requireAuth, requireRole('farmer'), asyncHandler(async (req: AuthedRequest, res) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await service.getFarmerSubscriptions(req.user!.id, { page, limit });
  res.json({
    subscriptions: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
}));

// GET /api/subscriptions/admin/all or GET /api/admin/subscriptions — Admin view all farmer subscriptions
subscriptionsRouter.get(['/admin/all', '/admin/subscriptions'], requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const result = await service.getAllSubscriptionsForAdmin({ page, limit });
  res.json({
    subscriptions: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
}));
