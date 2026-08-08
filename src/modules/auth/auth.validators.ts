import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is too short'),
  idNumber: z.string().min(4, 'ID number looks too short'),
  phone: z.string().min(9, 'Phone number looks invalid'),
  county: z.string().min(1),
  subCounty: z.string().min(1),
  passportImage: z.string().optional(),
});

export const loginSchema = z.object({
  idNumber: z.string().min(4),
  phone: z.string().min(9),
});

export const verifyOtpSchema = z.object({
  idNumber: z.string().min(4),
  phone: z.string().min(9),
  code: z.string().length(6),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
