import crypto from 'crypto';
import * as otpCodes from '../db/otpCodes.repo';
import { env } from '../config/env';
import type { UserRole } from './jwt';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Creates and "sends" an OTP. There is no real SMS gateway wired up here —
 * in dev/demo mode the code is logged to the console so you can test the
 * full auth flow locally. Swap the console.log for a real SMS provider
 * (Africa's Talking, Twilio SMS, etc.) before going to production; nothing
 * else in the auth flow needs to change.
 */
export async function createAndSendOtp(userId: string, role: Exclude<UserRole, 'admin'>, phone: string) {
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60_000);

  await otpCodes.create({ userId, userRole: role, codeHash, expiresAt });

  // --- MOCK SMS SEND ---
  // eslint-disable-next-line no-console
  console.log(`[OTP][MOCK SMS] Sending code ${code} to ${phone} (${role} ${userId})`);

  return env.nodeEnv !== 'production' ? code : undefined;
}

export async function verifyOtp(userId: string, role: Exclude<UserRole, 'admin'>, code: string): Promise<boolean> {
  const codeHash = hashCode(code);

  const record = await otpCodes.findValid(userId, role, codeHash);
  if (!record) return false;

  await otpCodes.markConsumed(record.id);
  return true;
}
