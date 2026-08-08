import { Router } from 'express';
import * as farmers from '../../db/farmers.repo';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireRole, AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';

export const farmersRouter = Router();

farmersRouter.get('/profile', requireAuth, requireRole('farmer'), asyncHandler(async (req: AuthedRequest, res) => {
  const farmer = await farmers.findById(req.user!.id);
  if (!farmer) throw new AppError('Farmer not found', 404);
  res.json({ farmer });
}));
