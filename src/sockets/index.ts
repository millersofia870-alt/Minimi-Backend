import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken, UserRole } from '../utils/jwt';
import * as vets from '../db/vets.repo';
import * as serviceRequests from '../db/serviceRequests.repo';
import * as chatMessages from '../db/chatMessages.repo';
import { rooms } from './rooms';
import { setIO } from './ioInstance';
import { env } from '../config/env';

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    role: UserRole;
  };
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  // --- Auth middleware: every connection must present a valid access token ---
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      console.warn('[Socket] Connection rejected: Missing auth token');
      return next(new Error('Missing auth token'));
    }

    try {
      const payload = verifyAccessToken(token);
      (socket as AuthedSocket).data.userId = payload.sub;
      (socket as AuthedSocket).data.role = payload.role;
      next();
    } catch (err: any) {
      console.warn('[Socket] Connection rejected: Invalid token -', err?.message);
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const s = socket as AuthedSocket;
    const { userId, role } = s.data;

    console.log(`[Socket] User connected: role=${role}, userId=${userId}, socketId=${socket.id}`);

    // Every user gets a personal room for direct notifications.
    s.join(rooms.user(role, userId));

    // Vets also join their county/sub-county room so they see
    // `new_service_request` broadcasts for their area in real time.
    if (role === 'vet') {
      const vet = await vets.findById(userId);
      if (vet) {
        s.join(rooms.county(vet.county, vet.subCounty));
        s.join(`presence:vet:${vet.id}`);
      }
    }

    // --- Chat: join a specific request's thread ---
    s.on('join_request_room', async ({ requestId }: { requestId: string }) => {
      if (!requestId) return;

      const request = await serviceRequests.findById(requestId);
      if (!request) {
        console.warn(`[Socket] join_request_room failed: Request ${requestId} not found`);
        return;
      }

      const isParticipant = role === 'admin'
        || (role === 'farmer' && request.farmerId === userId)
        || (role === 'vet' && request.vetId === userId);

      if (!isParticipant) {
        console.warn(`[Socket] join_request_room denied: User ${userId} (${role}) is not a participant of ${requestId}`);
        return;
      }

      s.join(rooms.request(requestId));
      console.log(`[Socket] Socket ${socket.id} (${role} ${userId}) joined room ${rooms.request(requestId)}`);
    });

    s.on('send_message', async ({ requestId, message, mediaUrl }: { requestId: string; message: string; mediaUrl?: string }) => {
      if (!requestId || !message?.trim()) return;

      const request = await serviceRequests.findById(requestId);
      if (!request) {
        console.warn(`[Socket] send_message failed: Request ${requestId} not found`);
        return;
      }

      const isParticipant = role === 'admin'
        || (role === 'farmer' && request.farmerId === userId)
        || (role === 'vet' && request.vetId === userId);

      if (!isParticipant) {
        console.warn(`[Socket] send_message denied: User ${userId} (${role}) is not a participant of ${requestId}`);
        return;
      }

      const saved = await chatMessages.create({
        requestId,
        senderRole: role as 'farmer' | 'vet',
        senderId: userId,
        message: message.trim(),
        mediaUrl,
      });

      console.log(`[Socket] Message sent in ${requestId} by ${role} ${userId}: "${message.trim()}"`);
      io.to(rooms.request(requestId)).emit('receive_message', saved);
    });

    s.on('typing', ({ requestId }: { requestId: string }) => {
      if (!requestId) return;
      s.to(rooms.request(requestId)).emit('typing_indicator', { requestId, senderRole: role });
    });

    s.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${role} ${userId} (${reason})`);
    });
  });

  setIO(io);
  return io;
}
