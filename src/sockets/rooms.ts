// Centralized room-naming conventions so every module that joins/emits to a
// room agrees on the exact string format.
export const rooms = {
  user: (role: 'farmer' | 'vet' | 'admin', id: string) => `user:${role}:${id}`,
  request: (requestId: string) => `request:${requestId}`,
  county: (county: string, subCounty: string) => `county:${county}:${subCounty}`,
};
