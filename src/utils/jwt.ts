import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import * as refreshTokens from '../db/refreshTokens.repo';

export type UserRole = 'farmer' | 'vet' | 'admin';

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issues a refresh token, persists its hash (never the raw token) so it can
 * be revoked/rotated later, and returns the raw token to send to the client.
 */
export async function issueRefreshToken(userId: string, role: UserRole): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(raw);

  const expiresInMs = parseDurationToMs(env.jwtRefreshExpiresIn);
  const expiresAt = new Date(Date.now() + expiresInMs);

  await refreshTokens.create({ userId, userRole: role, tokenHash, expiresAt });

  return raw;
}

export async function rotateRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const existing = await refreshTokens.findByHash(tokenHash);

  if (!existing || existing.revoked || existing.expiresAt < new Date()) {
    return null;
  }

  await refreshTokens.revokeById(existing.id);
  const newRaw = await issueRefreshToken(existing.userId, existing.userRole);

  return { userId: existing.userId, role: existing.userRole, newRefreshToken: newRaw };
}

export async function revokeRefreshToken(rawToken: string) {
  await refreshTokens.revokeByHash(hashToken(rawToken));
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * unitMs[unit];
}
