import { Router } from 'express';
import { z } from 'zod';
import * as serviceRequests from '../../db/serviceRequests.repo';
import * as captureImages from '../../db/captureImages.repo';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireRole, AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';

export const uploadsRouter = Router();

const captureBodySchema = z.object({
  image: z.string().startsWith('data:image/', 'Invalid image data URL'),
  type: z.enum(['livestock', 'crop']),
  notes: z.string().optional(),
});

// POST /api/vet/requests/:id/capture-image — JSON body with base64 data URL
uploadsRouter.post(
  '/vet/requests/:id/capture-image',
  requireAuth,
  requireRole('vet'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { image, type, notes } = captureBodySchema.parse(req.body);

    const request = await serviceRequests.findById(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    if (request.vetId !== req.user!.id) throw new AppError('You are not assigned to this request', 403);

    const capture = await captureImages.create({
      requestId: request.id,
      vetId: req.user!.id,
      farmerId: request.farmerId,
      imageUrl: image,
      type,
      notes,
    });

    res.status(201).json({ capture });
  })
);
