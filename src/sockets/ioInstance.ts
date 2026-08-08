import { Server } from 'socket.io';

// Holds the single Socket.io server instance once server.ts creates it, so
// other modules (service-requests, payments) can emit events without a
// circular import back to server.ts.
let ioRef: Server | null = null;

export function setIO(io: Server) {
  ioRef = io;
}

export function getIO(): Server | null {
  return ioRef;
}
