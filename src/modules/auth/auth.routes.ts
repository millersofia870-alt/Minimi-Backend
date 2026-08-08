import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authRateLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema, loginSchema, verifyOtpSchema, adminLoginSchema, refreshSchema,
} from './auth.validators';
import * as authService from './auth.service';

export const authRouter = Router();
authRouter.use(authRateLimiter);

// --- FARMER ---
authRouter.post('/farmer/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const farmer = await authService.registerFarmer(input);
  res.status(201).json({ farmer });
}));

authRouter.post('/farmer/login', asyncHandler(async (req, res) => {
  const { idNumber, phone } = loginSchema.parse(req.body);
  const result = await authService.loginStart('farmer', idNumber, phone);
  res.json({ message: 'OTP sent', ...(result.devCode ? { devCode: result.devCode } : {}) });
}));

authRouter.post('/farmer/verify-otp', asyncHandler(async (req, res) => {
  const { idNumber, phone, code } = verifyOtpSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await authService.verifyOtpAndIssueTokens('farmer', idNumber, phone, code);
  res.json({ accessToken, refreshToken, farmer: user });
}));

// --- VET ---
authRouter.post('/vet/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const vet = await authService.registerVet(input);
  res.status(201).json({ vet });
}));

authRouter.post('/vet/login', asyncHandler(async (req, res) => {
  const { idNumber, phone } = loginSchema.parse(req.body);
  const result = await authService.loginStart('vet', idNumber, phone);
  res.json({ message: 'OTP sent', ...(result.devCode ? { devCode: result.devCode } : {}) });
}));

authRouter.post('/vet/verify-otp', asyncHandler(async (req, res) => {
  const { idNumber, phone, code } = verifyOtpSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await authService.verifyOtpAndIssueTokens('vet', idNumber, phone, code);
  res.json({ accessToken, refreshToken, vet: user });
}));

// --- ADMIN ---
authRouter.post('/admin/login', asyncHandler(async (req, res) => {
  const { username, password } = adminLoginSchema.parse(req.body);
  const result = await authService.adminLogin(username, password);
  res.json(result);
}));

// --- SHARED ---
authRouter.post('/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.json(result);
}));

authRouter.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.status(204).send();
}));
