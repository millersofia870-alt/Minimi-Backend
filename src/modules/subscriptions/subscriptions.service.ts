import crypto from 'crypto';
import * as packagesRepo from '../../db/subscriptionPackages.repo';
import * as farmerSubscriptionsRepo from '../../db/farmerSubscriptions.repo';
import * as paymentsRepo from '../../db/payments.repo';
import { AppError } from '../../utils/AppError';
import { env } from '../../config/env';
import { notifyUser } from '../../sockets/notify';

export async function createPackage(data: {
  name: string;
  description: string;
  price: number;
  durationDays: number;
}) {
  if (!data.name || !data.description || data.price === undefined || data.durationDays === undefined) {
    throw new AppError('Name, description, price, and durationDays are required', 400);
  }
  if (data.price < 0) throw new AppError('Price cannot be negative', 400);
  if (data.durationDays <= 0) throw new AppError('Duration days must be greater than zero', 400);

  return packagesRepo.create(data);
}

export async function getPackages(includeDisabled = false) {
  if (includeDisabled) {
    return packagesRepo.listAll();
  }
  return packagesRepo.listActive();
}

export async function updatePackage(
  id: string,
  data: Partial<{ name: string; description: string; price: number; durationDays: number; isActive: boolean }>
) {
  const pkg = await packagesRepo.findById(id);
  if (!pkg) throw new AppError('Subscription package not found', 404);

  return packagesRepo.update(id, data);
}

export async function deletePackage(id: string) {
  const pkg = await packagesRepo.findById(id);
  if (!pkg) throw new AppError('Subscription package not found', 404);

  await packagesRepo.deletePackage(id);
  return { message: 'Package deleted successfully' };
}

export async function togglePackageActive(id: string, isActive?: boolean) {
  const pkg = await packagesRepo.findById(id);
  if (!pkg) throw new AppError('Subscription package not found', 404);

  return packagesRepo.toggleActive(id, isActive);
}

export async function initiateSubscriptionStkPush(farmerId: string, packageId: string, phone: string) {
  const pkg = await packagesRepo.findById(packageId);
  if (!pkg) throw new AppError('Subscription package not found', 404);
  if (!pkg.isActive) throw new AppError('This package is currently disabled', 400);

  const hasRealCreds = Boolean(
    env.mpesa.consumerKey &&
    env.mpesa.consumerSecret &&
    env.mpesa.passkey &&
    env.mpesa.shortcode &&
    env.mpesa.callbackUrl
  );

  const checkoutRequestId = hasRealCreds
    ? await callRealDarajaStkPush(pkg.id, pkg.price, phone)
    : `MOCK-SUB-${crypto.randomUUID()}`;

  // Create pending subscription record
  const subscription = await farmerSubscriptionsRepo.create({
    farmerId,
    packageId: pkg.id,
    amount: pkg.price,
    durationDays: pkg.durationDays,
    checkoutRequestId,
  });

  // eslint-disable-next-line no-console
  console.log(`[M-Pesa] Subscription STK push sent to ${phone} for KES ${pkg.price} (checkoutRequestId=${checkoutRequestId})`);

  return { subscription, checkoutRequestId };
}

export async function handleSubscriptionCallback(checkoutRequestId: string, success: boolean) {
  const sub = await farmerSubscriptionsRepo.findByCheckoutRequestId(checkoutRequestId);
  if (!sub) throw new AppError('Subscription record not found for this callback', 404);

  const updatedSub = await farmerSubscriptionsRepo.activateSubscription(sub.id, success);

  const payment = await paymentsRepo.findByCheckoutRequestId(checkoutRequestId);
  if (payment) {
    await paymentsRepo.updateStatus(payment.id, success ? 'success' : 'failed');
  }

  notifyUser('farmer', sub.farmerId, 'subscription_status_update', {
    subscription: updatedSub,
    status: updatedSub.status,
  });

  return updatedSub;
}

export async function getFarmerSubscriptions(farmerId: string, options?: { page?: number; limit?: number }) {
  return farmerSubscriptionsRepo.listByFarmer(farmerId, options);
}

export async function getAllSubscriptionsForAdmin(options?: { page?: number; limit?: number }) {
  return farmerSubscriptionsRepo.listAllWithDetails(options);
}

async function callRealDarajaStkPush(packageId: string, amount: number, phone: string): Promise<string> {
  const baseUrl = env.mpesa.baseUrl;
  const authHeader = Buffer.from(`${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`).toString('base64');

  const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: { Authorization: `Basic ${authHeader}` },
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new AppError(`Daraja auth failed: ${tokenResponse.status} ${body}`, 502);
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new AppError('Daraja auth response did not include an access token', 502);
  }

  const timestamp = formatTimestamp(new Date());
  const password = Buffer.from(`${env.mpesa.shortcode}${env.mpesa.passkey}${timestamp}`).toString('base64');
  const normalizedPhone = normalizePhone(phone);

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: env.mpesa.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: normalizedPhone,
      PartyB: env.mpesa.shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: env.mpesa.callbackUrl,
      AccountReference: packageId,
      TransactionDesc: 'Minimi Agri Subscription',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`Daraja STK push failed: ${response.status} ${body}`, 502);
  }

  const data = (await response.json()) as { CheckoutRequestID?: string; checkoutRequestId?: string };
  const checkoutRequestId = data.CheckoutRequestID ?? data.checkoutRequestId;
  if (!checkoutRequestId) {
    throw new AppError('Daraja STK push response did not include a checkout request ID', 502);
  }

  return checkoutRequestId;
}

function formatTimestamp(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join('');
}

function normalizePhone(phone: string): string {
  const p = phone.trim();
  if (p.startsWith('+254')) return p.replace('+', '');
  if (p.startsWith('254')) return p;
  if (p.startsWith('0')) return `254${p.slice(1)}`;
  return p;
}
