import { Router } from 'express';
import * as chatMessages from '../../db/chatMessages.repo';
import * as serviceRequests from '../../db/serviceRequests.repo';
import * as vets from '../../db/vets.repo';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { paginate } from '../../utils/pagination';
import { assertParticipant } from '../service-requests/service-requests.service';

export const chatRouter = Router();

// GET /api/chat/inbox — returns the authenticated user's service requests
// enriched with the latest chat message for each and unread count.
chatRouter.get('/inbox', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { id: userId, role } = req.user!;
  let requests: any[] = [];

  if (role === 'farmer') {
    requests = await serviceRequests.listByFarmer(userId);
    requests = requests.filter((r) => r.vetId);
  } else if (role === 'vet') {
    const vet = await vets.findById(userId);
    if (!vet) { res.status(404).json({ error: 'Vet not found' }); return; }
    const all = await serviceRequests.listForVet(userId, vet.county, vet.subCounty);
    requests = all.filter((r: any) => r.vetId === userId);
  } else {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const requestIds = requests.map((r: any) => r.id);
  const oppositeRole = role === 'farmer' ? 'vet' : 'farmer';
  const [lastMessages, unreadCounts] = await Promise.all([
    chatMessages.latestByRequestIds(requestIds),
    chatMessages.countUnreadByRequestIds(requestIds, oppositeRole),
  ]);

  const threads = requests.map((r: any) => {
    const last = lastMessages.get(r.id) ?? null;
    const unreadCount = unreadCounts.get(r.id) ?? 0;
    return {
      requestId: r.id,
      farmerName: (r as any).farmerName ?? null,
      vetName: (r as any).vetName ?? null,
      vetId: r.vetId ?? null,
      farmerId: r.farmerId,
      county: r.county,
      subCounty: r.subCounty,
      animalOrCropType: r.animalOrCropType,
      status: r.status,
      requestedAt: r.requestedAt,
      lastMessage: last?.message ?? null,
      lastSentAt: last?.sentAt ?? r.requestedAt,
      lastSenderRole: last?.senderRole ?? null,
      unreadCount,
    };
  }).sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime());

  res.json({ threads });
}));

// PATCH /api/chat/:requestId/read — mark messages as read
chatRouter.patch('/:requestId/read', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  await assertParticipant(req.params.requestId, req.user!.id, req.user!.role);
  if (req.user!.role === 'farmer' || req.user!.role === 'vet') {
    await chatMessages.markReadByRequest(req.params.requestId, req.user!.role);
  }
  res.json({ success: true });
}));

// GET /api/chat/:requestId/messages?before=<messageId> — paginated history
chatRouter.get('/:requestId/messages', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  await assertParticipant(req.params.requestId, req.user!.id, req.user!.role);

  if (req.user!.role === 'farmer' || req.user!.role === 'vet') {
    await chatMessages.markReadByRequest(req.params.requestId, req.user!.role);
  }

  const before = typeof req.query.before === 'string' ? req.query.before : undefined;
  const messages = await chatMessages.listByRequest(req.params.requestId, before);
  const paginatedMessages = paginate(messages.reverse(), req.query, 20);

  res.json({ messages: paginatedMessages.items, pagination: paginatedMessages.pagination });
}));


