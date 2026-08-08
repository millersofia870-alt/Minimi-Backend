import crypto from 'crypto';
import * as serviceRequests from '../../db/serviceRequests.repo';
import * as payments from '../../db/payments.repo';
import * as farmerSubscriptions from '../../db/farmerSubscriptions.repo';
import { handleSubscriptionCallback } from '../subscriptions/subscriptions.service';
import { AppError } from '../../utils/AppError';
import { env } from '../../config/env';
import { notifyUser } from '../../sockets/notify';
import type { UserRole } from '../../utils/jwt';
import * as wallets from '../../db/wallets.repo';

/**
 * M-Pesa Daraja integration.
 *
 * There are no real Daraja credentials configured in this dev environment
 * (MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET are empty — see .env.example),
 * so `initiateStkPush` below simulates Safaricom's response instead of
 * calling the real API. The real integration point is clearly marked; swap
 * it in without touching any other code once you have sandbox/production
 * credentials from https://developer.safaricom.co.ke.
 *
 * Real flow would be:
 *   1. POST to Daraja /oauth/v1/generate for an access token (consumer key/secret)
 *   2. POST to Daraja /mpesa/stkpush/v1/processrequest with shortcode, passkey,
 *      timestamp-based password, amount, phone, and MPESA_CALLBACK_URL
 *   3. Safaricom calls MPESA_CALLBACK_URL asynchronously -> handleCallback() below
 */

export async function initiateStkPush(requestId: string, actorId: string, actorRole: UserRole, amount: number | undefined, phone: string) {
  const request = await serviceRequests.findById(requestId);
  if (!request) throw new AppError('Request not found', 404);
  if (request.farmerId !== actorId && actorRole !== 'admin' && actorRole !== 'vet') {
    throw new AppError('This is not your request', 403);
  }
  if (request.feeStatus !== 'approved') throw new AppError('Service fee must be approved before payment', 409);
  if (request.status === 'cancelled') throw new AppError('Cannot pay for a cancelled request', 409);

  const amountToPay = typeof amount === 'number' ? amount : request.serviceFee;
  if (!amountToPay || amountToPay <= 0) {
    throw new AppError('Service fee must be greater than zero', 409);
  }

  const hasRealCreds = Boolean(
    env.mpesa.consumerKey &&
    env.mpesa.consumerSecret &&
    env.mpesa.passkey &&
    env.mpesa.shortcode &&
    env.mpesa.callbackUrl
  );

  const checkoutRequestId = hasRealCreds
    ? await callRealDarajaStkPush(requestId, amountToPay, phone)
    : `MOCK-${crypto.randomUUID()}`;

  const payment = await payments.create({ requestId, farmerId: request.farmerId, vetId: request.vetId ?? null, amount: amountToPay, phone, checkoutRequestId });

  const logPrefix = hasRealCreds ? '[M-Pesa][DARAJA]' : '[M-Pesa][MOCK]';
  // eslint-disable-next-line no-console
  console.log(`${logPrefix} STK push "sent" to ${phone} for KES ${amountToPay} (checkoutRequestId=${checkoutRequestId})`);

  return payment;
}

// Wallet deposits use the same Daraja integration, but are recorded in the
// wallet ledger instead of being tied to a service request.
export async function initiateWalletDepositStkPush(amount: number, phone: string): Promise<string> {
  const hasRealCreds = Boolean(env.mpesa.consumerKey && env.mpesa.consumerSecret && env.mpesa.passkey && env.mpesa.shortcode && env.mpesa.callbackUrl);
  return hasRealCreds ? callRealDarajaStkPush(`WALLET-${crypto.randomUUID()}`, amount, phone) : `MOCK-WALLET-${crypto.randomUUID()}`;
}

async function callRealDarajaStkPush(requestId: string, amount: number, phone: string): Promise<string> {
  const baseUrl = env.mpesa.baseUrl;
  const authHeader = Buffer.from(`${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`).toString('base64');

  const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: { Authorization: `Basic ${authHeader}` },
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    // eslint-disable-next-line no-console
    console.error('[M-Pesa][DARAJA] Auth response:', tokenResponse.status, body);
    throw new AppError(`Daraja auth failed: ${tokenResponse.status} ${body}`, 502);
  }

  const tokenData = await tokenResponse.json() as { access_token?: string };
  // eslint-disable-next-line no-console
  console.log('[M-Pesa][DARAJA] Auth token response:', tokenData);
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
      AccountReference: requestId,
      TransactionDesc: 'Minimi Agri payment',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    // eslint-disable-next-line no-console
    console.error('[M-Pesa][DARAJA] STK push response:', response.status, body);
    throw new AppError(`Daraja STK push failed: ${response.status} ${body}`, 502);
  }

  const data = await response.json() as { CheckoutRequestID?: string; checkoutRequestId?: string };
  // eslint-disable-next-line no-console
  console.log('[M-Pesa][DARAJA] STK push payload response:', data);
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

export async function handleCallback(body: any) {
  // eslint-disable-next-line no-console
  console.log('[M-Pesa][CALLBACK] Raw callback body:', JSON.stringify(body, null, 2));

  // Real Safaricom callback shape:
  // { Body: { stkCallback: { CheckoutRequestID, ResultCode, CallbackMetadata } } }
  const stkCallback = body?.Body?.stkCallback;
  // eslint-disable-next-line no-console
  console.log('[M-Pesa][CALLBACK] Parsed stk callback:', JSON.stringify(stkCallback, null, 2));
  if (!stkCallback) {
    console.warn('[M-Pesa][CALLBACK] Missing stkCallback, returning Accepted');
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  const checkoutRequestId: string = stkCallback.CheckoutRequestID;
  const success = stkCallback.ResultCode === 0;

  // Wallet deposits are idempotent: completeDeposit locks the ledger record
  // and ignores repeat callbacks before changing a balance.
  const walletTransaction = await wallets.findTransactionByCheckout(checkoutRequestId);
  if (walletTransaction) {
    const receipt = success
      ? stkCallback.CallbackMetadata?.Item?.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value
      : undefined;
    return await wallets.completeDeposit(checkoutRequestId, success, receipt);
  }

  const sub = await farmerSubscriptions.findByCheckoutRequestId(checkoutRequestId);
  if (sub) {
    return await handleSubscriptionCallback(checkoutRequestId, success);
  }

  const payment = await payments.findByCheckoutRequestId(checkoutRequestId);
  if (!payment) throw new AppError('Payment not found for this callback', 404);

  if (payment.status === 'success' || payment.status === 'failed') {
    return payment;
  }

  const receipt = success
    ? stkCallback.CallbackMetadata?.Item?.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value
    : undefined;

  const amountPaid = success
    ? Number(stkCallback.CallbackMetadata?.Item?.find((i: any) => i.Name === 'Amount')?.Value ?? payment.amount)
    : 0;

  const request = await serviceRequests.findById(payment.requestId);
  if (!request) throw new AppError('Request not found for payment callback', 404);

  const existingSuccessPayments = await payments.listSuccessByRequest(payment.requestId);
  const alreadyPaid = existingSuccessPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = (request.serviceFee ?? 0) - alreadyPaid;

  if (success && amountPaid > remainingBalance) {
    throw new AppError('Overpayment not allowed for this service request', 409);
  }

  const updated = await payments.updateStatus(payment.id, success ? 'success' : 'failed', receipt);

  if (success && remainingBalance - amountPaid <= 0) {
    await serviceRequests.markPaid(payment.requestId);
  }

  notifyUser('farmer', payment.farmerId, 'payment_status_update', {
    payment: updated,
    requestId: payment.requestId,
    remainingBalance: Math.max(remainingBalance - amountPaid, 0),
  });
  return updated;
}

// Dev-only helper so the payment flow can be tested end-to-end without a
// real Safaricom sandbox. Mirrors what handleCallback() would receive.
export async function simulateCallback(checkoutRequestId: string, success: boolean) {
  const fakeBody = {
    Body: {
      stkCallback: {
        CheckoutRequestID: checkoutRequestId,
        ResultCode: success ? 0 : 1,
        CallbackMetadata: success
          ? { Item: [{ Name: 'MpesaReceiptNumber', Value: `MOCK${Date.now()}` }] }
          : undefined,
      },
    },
  };
  return handleCallback(fakeBody);
}

export async function getPaymentByRequest(requestId: string) {
  const payment = await payments.findLatestByRequest(requestId);
  if (!payment) throw new AppError('No payment found for this request', 404);
  return payment;
}

export async function getPaymentsByFarmer(farmerId: string, options?: { page?: number; limit?: number }) {
  return payments.listByFarmer(farmerId, options);
}

export async function getPaymentsByVet(vetId: string, options?: { page?: number; limit?: number }) {
  return payments.listByVet(vetId, options);
}

export async function getUnifiedPaymentsByFarmer(farmerId: string, options?: { page?: number; limit?: number }) {
  return payments.listAllByFarmerUnified(farmerId, options);
}
