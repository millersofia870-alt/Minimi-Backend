import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireRole, AuthedRequest } from '../../middleware/auth';
import { paginate } from '../../utils/pagination';
import { createRequestSchema, setFeeSchema } from './service-requests.validators';
import * as service from './service-requests.service';

export const serviceRequestsRouter = Router();

// POST /api/service-requests — farmer creates a new request
serviceRequestsRouter.post('/', requireAuth, requireRole('farmer'), asyncHandler(async (req: AuthedRequest, res) => {
  const input = createRequestSchema.parse(req.body);
  const request = await service.createRequest(req.user!.id, input);
  res.status(201).json({ request });
}));

// GET /api/service-requests/my — farmer's own request history
serviceRequestsRouter.get('/my', requireAuth, requireRole('farmer'), asyncHandler(async (req: AuthedRequest, res) => {
  const requests = await service.listMyRequests(req.user!.id);
  const result = paginate(requests, req.query);
  res.json({ requests: result.items, pagination: result.pagination });
}));

// GET /api/service-requests/:id — either participant (or admin) can view
serviceRequestsRouter.get('/:id', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  await service.assertParticipant(req.params.id, req.user!.id, req.user!.role);
  const request = await service.getRequestById(req.params.id);
  res.json({ request });
}));

// PATCH /api/service-requests/:id/accept — vet claims a pending request
serviceRequestsRouter.patch('/:id/accept', requireAuth, requireRole('vet'), asyncHandler(async (req: AuthedRequest, res) => {
  const request = await service.acceptRequest(req.user!.id, req.params.id);
  res.json({ request });
}));

// PATCH /api/service-requests/:id/complete — vet marks their request done
serviceRequestsRouter.patch('/:id/complete', requireAuth, requireRole('vet'), asyncHandler(async (req: AuthedRequest, res) => {
  const request = await service.completeRequest(req.user!.id, req.params.id);
  res.json({ request });
}));

// PATCH /api/service-requests/:id/fee — vet proposes a fee, admin approves it
serviceRequestsRouter.patch('/:id/fee', requireAuth, requireRole('vet', 'admin'), asyncHandler(async (req: AuthedRequest, res) => {
  const input = setFeeSchema.parse(req.body);
  const role = req.user!.role as 'vet' | 'admin';
  const request = await service.setRequestFee(req.user!.id, role, req.params.id, input.amount, input.approve);
  res.json({ request });
}));
