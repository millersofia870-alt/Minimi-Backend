import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

import { authRouter } from './modules/auth/auth.routes';
import { farmersRouter } from './modules/farmers/farmers.routes';
import { vetsRouter } from './modules/vets/vets.routes';
import { serviceRequestsRouter } from './modules/service-requests/service-requests.routes';
import { chatRouter } from './modules/chat/chat.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { uploadsRouter } from './modules/uploads/uploads.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { referenceRouter } from './modules/reference/reference.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';
import { walletsRouter } from './modules/wallets/wallets.routes';
import { setupSwagger } from './swagger';

export const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Serve uploaded capture images statically. In production, swap local
// storage for S3/Cloudinary and drop this line — see uploads.middleware.ts.
app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/farmer', farmersRouter);
app.use('/api/vet', vetsRouter);
app.use('/api/vets', vetsRouter); // /api/vets/nearby reads naturally under the plural too
app.use('/api/service-requests', serviceRequestsRouter);
app.use('/api/chat', chatRouter);
app.use('/api', paymentsRouter); // exposes /api/mpesa/* and /api/payments/*
app.use('/api', uploadsRouter);  // exposes /api/vet/requests/:id/capture-image
app.use('/api', walletsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reference', referenceRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/farmer/subscriptions', subscriptionsRouter);

setupSwagger(app);

app.use(notFoundHandler);
app.use(errorHandler);
