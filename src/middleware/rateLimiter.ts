import rateLimit from 'express-rate-limit';

// Protects auth endpoints (register/login/OTP) against brute-force and
// enumeration attacks, since farmer/vet login has no password.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});

// Protects admin endpoints against abuse.
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests, please try again later.' },
});
