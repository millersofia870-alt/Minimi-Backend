import bcrypt from 'bcryptjs';
import { AppError } from '../../utils/AppError';
import { createAndSendOtp, verifyOtp } from '../../utils/otp';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken, UserRole } from '../../utils/jwt';
import * as farmers from '../../db/farmers.repo';
import * as vets from '../../db/vets.repo';
import * as admins from '../../db/admins.repo';

type RegisterInput = { fullName: string; idNumber: string; phone: string; county: string; subCounty: string; passportImage?: string };

async function findUserByPhoneAndId(role: 'farmer' | 'vet', idNumber: string, phone: string) {
  if (role === 'farmer') return farmers.findByPhoneAndIdNumber(phone, idNumber);
  return vets.findByPhoneAndIdNumber(phone, idNumber);
}

export async function registerFarmer(input: RegisterInput) {
  const existing = await farmers.findByIdNumberOrPhone(input.idNumber, input.phone);
  if (existing) throw new AppError('A farmer with this ID number or phone already exists', 409);
  return farmers.create(input);
}

export async function registerVet(input: RegisterInput) {
  const existing = await vets.findByIdNumberOrPhone(input.idNumber, input.phone);
  if (existing) throw new AppError('A vet with this ID number or phone already exists', 409);
  const vet = await vets.create(input);

  if (input.passportImage) {
    if (!input.passportImage.startsWith('data:image/')) throw new AppError('Invalid image data URL', 400);
    if (Buffer.byteLength(input.passportImage, 'utf8') > 5 * 1024 * 1024) throw new AppError('Image must be under 5MB', 400);
    return await vets.setProfileImage(vet.id, input.passportImage);
  }

  return vet;
}

export async function loginStart(role: 'farmer' | 'vet', idNumber: string, phone: string) {
  const user = await findUserByPhoneAndId(role, idNumber, phone);
  if (!user) throw new AppError('No account found with that ID number and phone combination', 404);

  const devCode = await createAndSendOtp(user.id, role, phone);
  return { userId: user.id, devCode }; // devCode is only populated outside production
}

export async function verifyOtpAndIssueTokens(role: 'farmer' | 'vet', idNumber: string, phone: string, code: string) {
  const user = await findUserByPhoneAndId(role, idNumber, phone);
  if (!user) throw new AppError('No account found with that ID number and phone combination', 404);

  if (role === 'vet' && (user as vets.Vet).status === 'suspended') {
    throw new AppError('This vet account has been suspended', 403);
  }

  const ok = await verifyOtp(user.id, role, code);
  if (!ok) throw new AppError('Invalid or expired code', 401);

  const accessToken = signAccessToken({ sub: user.id, role });
  const refreshToken = await issueRefreshToken(user.id, role);

  return { accessToken, refreshToken, user };
}

export async function adminLogin(username: string, password: string) {
  const admin = await admins.findByUsername(username);
  if (!admin) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const accessToken = signAccessToken({ sub: admin.id, role: 'admin' });
  const refreshToken = await issueRefreshToken(admin.id, 'admin');

  return { accessToken, refreshToken, admin: { id: admin.id, username: admin.username } };
}

export async function refresh(rawToken: string) {
  const result = await rotateRefreshToken(rawToken);
  if (!result) throw new AppError('Invalid or expired refresh token', 401);

  const accessToken = signAccessToken({ sub: result.userId, role: result.role as UserRole });
  return { accessToken, refreshToken: result.newRefreshToken };
}

export async function logout(rawToken: string) {
  await revokeRefreshToken(rawToken);
}
