import * as serviceRequests from '../../db/serviceRequests.repo';
import * as vets from '../../db/vets.repo';
import { AppError } from '../../utils/AppError';
import { notifyUser } from '../../sockets/notify';

type CreateRequestInput = {
  county: string;
  subCounty: string;
  description: string;
  animalOrCropType: string;
  vetId?: string;
};

export async function createRequest(farmerId: string, input: CreateRequestInput) {
  if (input.vetId) {
    const vet = await vets.findById(input.vetId);
    if (!vet || vet.status !== 'approved') {
      throw new AppError('Selected vet is not available', 400);
    }
  }

  const request = await serviceRequests.create({ farmerId, ...input });

  // Notify vets in the same county/sub-county room that a new request landed.
  notifyUser('county', `${input.county}:${input.subCounty}`, 'new_service_request', { request });

  return request;
}

export async function listMyRequests(farmerId: string) {
  return serviceRequests.listByFarmer(farmerId);
}

export async function acceptRequest(vetId: string, requestId: string) {
  const request = await serviceRequests.findById(requestId);
  if (!request) throw new AppError('Request not found', 404);
  if (request.status !== 'pending') throw new AppError('Request is no longer pending', 409);

  const vet = await vets.findById(vetId);
  if (!vet || vet.status !== 'approved') throw new AppError('Vet is not approved to accept requests', 403);

  const updated = await serviceRequests.accept(requestId, vetId);

  notifyUser('farmer', request.farmerId, 'request_status_update', { request: updated });
  return updated;
}

export async function completeRequest(vetId: string, requestId: string) {
  const request = await serviceRequests.findById(requestId);
  if (!request) throw new AppError('Request not found', 404);
  if (request.vetId !== vetId) throw new AppError('You are not assigned to this request', 403);
  if (!['accepted', 'in_progress'].includes(request.status)) {
    throw new AppError('Request cannot be completed from its current status', 409);
  }

  const updated = await serviceRequests.complete(requestId);

  notifyUser('farmer', request.farmerId, 'request_status_update', { request: updated });
  return updated;
}

export async function setRequestFee(actorId: string, actorRole: 'vet' | 'admin', requestId: string, amount: number, approve = false) {
  const request = await serviceRequests.findById(requestId);
  if (!request) throw new AppError('Request not found', 404);

  if (actorRole === 'vet') {
    if (request.vetId !== actorId) throw new AppError('You are not assigned to this request', 403);
    return serviceRequests.setFee(requestId, amount, 'pending_approval');
  }

  if (actorRole === 'admin') {
    return serviceRequests.setFee(requestId, amount, approve ? 'approved' : 'pending_approval');
  }

  throw new AppError('Forbidden', 403);
}

export async function getRequestById(requestId: string) {
  const request = await serviceRequests.findById(requestId);
  if (!request) throw new AppError('Request not found', 404);
  return request;
}

// Used to authorize access to a request's chat/images — only the assigned
// farmer or vet (or an admin) may view it.
export async function assertParticipant(requestId: string, userId: string, role: 'farmer' | 'vet' | 'admin') {
  if (role === 'admin') return;
  const request = await serviceRequests.findById(requestId);
  if (!request) throw new AppError('Request not found', 404);

  const isParticipant = role === 'farmer' ? request.farmerId === userId : request.vetId === userId;
  if (!isParticipant) throw new AppError('You are not part of this request', 403);
}
