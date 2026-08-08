import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { env } from '../../config/env';
import * as payments from './payments.service';

export const paymentsRouter = Router();

const stkPushSchema = z.object({
  requestId: z.string().min(1),
  amount: z.number().positive().optional(),
  phone: z.string().min(9),
});

// POST /api/mpesa/stk-push — authenticated caller can initiate payment for a completed request
paymentsRouter.post('/mpesa/stk-push', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { requestId, amount, phone } = stkPushSchema.parse(req.body);
  const payment = await payments.initiateStkPush(requestId, req.user!.id, req.user!.role, amount, phone);
  res.status(201).json({ payment });
}));

// POST /api/mpesa/callback — Safaricom Daraja calls this asynchronously.
// No auth middleware: this is a public webhook. In production, verify the
// request against Safaricom's IP range / signature per Daraja docs.
paymentsRouter.post('/mpesa/callback', asyncHandler(async (req, res) => {
  await payments.handleCallback(req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}));

// POST /api/mpesa/simulate-callback — DEV ONLY. Lets you test the full
// payment flow locally without real Safaricom sandbox credentials. Remove
// or gate behind an admin-only + non-production check before deploying.
if (env.nodeEnv !== 'production') {
  const simulateSchema = z.object({ checkoutRequestId: z.string(), success: z.boolean().default(true) });
  paymentsRouter.post('/mpesa/simulate-callback', asyncHandler(async (req, res) => {
    const { checkoutRequestId, success } = simulateSchema.parse(req.body);
    const payment = await payments.simulateCallback(checkoutRequestId, success);
    res.json({ payment });
  }));
}

// GET /api/payments/:requestId
paymentsRouter.get('/payments/:requestId', requireAuth, asyncHandler(async (req, res) => {
  const payment = await payments.getPaymentByRequest(req.params.requestId);
  res.json({ payment });
}));

// GET /api/payments/farmer/:farmerId — paginated payments for a specific farmer (farmer themselves or admin)
paymentsRouter.get('/payments/farmer/:farmerId', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { farmerId } = req.params;
  const caller = req.user!;
  if (caller.role !== 'admin' && !(caller.role === 'farmer' && caller.id === farmerId)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const result = await payments.getPaymentsByFarmer(farmerId, { page, limit });
  res.json({
    payments: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
}));

// GET /api/payments/vet/:vetId — paginated payments for a specific vet (vet themselves or admin)
paymentsRouter.get('/payments/vet/:vetId', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { vetId } = req.params;
  const caller = req.user!;
  if (caller.role !== 'admin' && !(caller.role === 'vet' && caller.id === vetId)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const result = await payments.getPaymentsByVet(vetId, { page, limit });
  res.json({
    payments: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
}));

// GET /api/payments/farmer/:farmerId/unified — combined vet service + subscription payments (farmer or admin)
paymentsRouter.get('/payments/farmer/:farmerId/unified', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { farmerId } = req.params;
  const caller = req.user!;
  if (caller.role !== 'admin' && !(caller.role === 'farmer' && caller.id === farmerId)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const result = await payments.getUnifiedPaymentsByFarmer(farmerId, { page, limit });
  res.json({
    payments: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
}));

