import { z } from 'zod';

export const createRequestSchema = z.object({
  county: z.string().min(1),
  subCounty: z.string().min(1),
  description: z.string().min(3),
  animalOrCropType: z.string().min(1),
  vetId: z.string().optional(), // farmer may pick a specific vet from /api/vets/nearby
});

export const setFeeSchema = z.object({
  amount: z.number().positive(),
  approve: z.boolean().optional().default(false),
});
