import { getIO } from './ioInstance';
import { rooms } from './rooms';

type Scope = 'farmer' | 'vet' | 'admin' | 'county';

/**
 * Emits a real-time event to a room, if the socket server is up and someone
 * is listening. Safe to call even if Socket.io hasn't started yet (e.g. in
 * tests) — it just becomes a no-op.
 *
 * - scope 'farmer' | 'vet' | 'admin': `key` is that user's id.
 * - scope 'county': `key` is "County:SubCounty" (matches how vets join on connect).
 */
export function notifyUser(scope: Scope, key: string, event: string, payload: unknown) {
  const io = getIO();
  if (!io) return;

  if (scope === 'county') {
    const [county, subCounty] = key.split(':');
    io.to(rooms.county(county, subCounty)).emit(event, payload);
    return;
  }

  io.to(rooms.user(scope, key)).emit(event, payload);
}
