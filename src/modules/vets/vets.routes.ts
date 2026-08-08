import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import * as vets from '../../db/vets.repo';
import * as serviceRequests from '../../db/serviceRequests.repo';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireRole, AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';
import { paginate } from '../../utils/pagination';
import { vetProfileImageUpload } from '../uploads/uploads.middleware';

export const vetsRouter = Router();

vetsRouter.get('/profile', requireAuth, requireRole('vet'), asyncHandler(async (req: AuthedRequest, res) => {
  const vet = await vets.findById(req.user!.id);
  if (!vet) throw new AppError('Vet not found', 404);
  res.json({ vet });
}));

vetsRouter.post('/profile/image', requireAuth, requireRole('vet'), vetProfileImageUpload.single('image'), asyncHandler(async (req: AuthedRequest, res) => {
  if (!req.file) throw new AppError('No image file provided (field name should be "image")', 400);

  const mimeType = req.file.mimetype;
  const buffer = fs.readFileSync(req.file.path);
  if (buffer.length > 5 * 1024 * 1024) throw new AppError('Image must be under 5MB', 400);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const vet = await vets.setProfileImage(req.user!.id, dataUrl);

  fs.unlinkSync(req.file.path);

  res.json({ vet });
}));

vetsRouter.get('/:id/profile', requireAuth, asyncHandler(async (req, res) => {
  const vet = await vets.findById(req.params.id);
  if (!vet) throw new AppError('Vet not found', 404);
  res.json({ vet: { id: vet.id, fullName: vet.fullName, county: vet.county, subCounty: vet.subCounty, status: vet.status, rating: vet.rating, profileImageUrl: vet.profileImageUrl, createdAt: vet.createdAt } });
}));

vetsRouter.get('/requests', requireAuth, requireRole('vet'), asyncHandler(async (req: AuthedRequest, res) => {
  const vet = await vets.findById(req.user!.id);
  if (!vet) throw new AppError('Vet not found', 404);

  const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;

  const requests = await serviceRequests.listForVet(vet.id, vet.county, vet.subCounty, statusFilter);
  const result = paginate(requests, req.query);

  res.json({ requests: result.items, pagination: result.pagination });
}));

vetsRouter.get('/earnings', requireAuth, requireRole('vet'), asyncHandler(async (req: AuthedRequest, res) => {
  const completedRequests = await serviceRequests.listCompletedByVetWithEarnings(req.user!.id);
  const result = paginate(completedRequests, req.query);
  const total = completedRequests.reduce((sum, r) => sum + r.earned, 0);
  res.json({ total, requests: result.items, pagination: result.pagination });
}));

const nearbyQuerySchema = z.object({
  county: z.string().min(1),
  subCounty: z.string().optional(),
});

vetsRouter.get('/nearby', requireAuth, requireRole('farmer'), asyncHandler(async (req, res) => {
  const { county, subCounty } = nearbyQuerySchema.parse(req.query);
  const nearby = await vets.listApprovedNearby(county, subCounty);
  const result = paginate(nearby, req.query);
  res.json({ vets: result.items, pagination: result.pagination });
}));
