import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAuth, requireRole, AuthedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { AppError } from '../../utils/AppError';
import { paginate } from '../../utils/pagination';
import * as wallets from '../../db/wallets.repo';
import * as serviceRequests from '../../db/serviceRequests.repo';
import { initiateWalletDepositStkPush } from '../payments/payments.service';
import { notifyUser } from '../../sockets/notify';

export const walletsRouter = Router();
const amountSchema = z.object({ amount: z.number().positive().max(1_000_000), phone: z.string().min(9) });

walletsRouter.get('/wallet', requireAuth, requireRole('farmer', 'vet'), asyncHandler(async (req: AuthedRequest, res) => {
  const role = req.user!.role as 'farmer' | 'vet';
  const data = await wallets.list(req.user!.id, role, Number(req.query.page || 1), Number(req.query.limit || 20));
  res.json({ ...data, pagination: { total: data.total, page: Number(req.query.page || 1), limit: Number(req.query.limit || 20) } });
}));

walletsRouter.post('/wallet/deposits/stk-push', requireAuth, requireRole('farmer'), asyncHandler(async (req: AuthedRequest, res) => {
  const { amount, phone } = amountSchema.parse(req.body);
  const checkoutRequestId = await initiateWalletDepositStkPush(amount, phone);
  const transaction = await wallets.createDeposit(req.user!.id, amount, checkoutRequestId);
  res.status(201).json({ transaction, checkoutRequestId, message: 'STK push initiated. Your balance updates only after the M-Pesa callback succeeds.' });
}));

const paymentRequestSchema = z.object({ amount: z.number().positive().max(1_000_000) });

walletsRouter.post('/wallet/payment-requests/:requestId', requireAuth, requireRole('vet'), asyncHandler(async (req: AuthedRequest, res) => {
  const { amount } = paymentRequestSchema.parse(req.body);
  const request = await serviceRequests.findById(req.params.requestId);
  if (!request) throw new AppError('Request not found', 404);
  if (request.vetId !== req.user!.id) throw new AppError('You are not assigned to this request', 403);
  if (request.feeStatus !== 'approved' || request.serviceFee == null) throw new AppError('Service fee must be approved first', 409);
  if (amount !== request.serviceFee) throw new AppError('Wallet payment must equal the approved service fee', 409);
  if (request.paidAt) throw new AppError('This service request has already been paid', 409);
  const paymentRequest = await wallets.createPaymentRequest(request.id, request.farmerId, req.user!.id, amount);
  notifyUser('farmer', request.farmerId, 'wallet_payment_requested', { paymentRequest });
  res.status(201).json({ paymentRequest });
}));

walletsRouter.get('/wallet/payment-requests', requireAuth, requireRole('farmer', 'vet'), asyncHandler(async (req: AuthedRequest, res) => {
  const role = req.user!.role as 'farmer' | 'vet';
  const requests = await wallets.listPaymentRequests(req.user!.id, role);
  const result = paginate(requests, req.query);
  res.json({ paymentRequests: result.items, pagination: result.pagination });
}));

walletsRouter.post('/wallet/payment-requests/:id/accept', requireAuth, requireRole('farmer'), asyncHandler(async (req: AuthedRequest, res) => {
  try {
    const result = await wallets.payPaymentRequest(req.params.id, req.user!.id);
    notifyUser('vet', result.paymentRequest.vetId, 'wallet_payment_completed', result);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Forbidden') throw new AppError(error.message, 403);
    if (error.message === 'Insufficient wallet balance') throw new AppError(error.message, 409);
    if (error.message.includes('already been paid')) throw new AppError(error.message, 409);
    throw new AppError(error.message || 'Could not process wallet payment', 400);
  }
}));

walletsRouter.post('/wallet/payment-requests/:id/reject', requireAuth, requireRole('farmer'), asyncHandler(async (req: AuthedRequest, res) => {
  if (!(await wallets.rejectPaymentRequest(req.params.id, req.user!.id))) throw new AppError('Payment request not found or already resolved', 404);
  res.status(204).send();
}));
