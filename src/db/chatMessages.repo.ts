import { pool } from '../config/db';
import { newId } from './id';

export interface ChatMessage {
  id: string;
  requestId: string;
  senderRole: 'farmer' | 'vet';
  senderId: string;
  message: string;
  mediaUrl: string | null;
  sentAt: Date;
  readAt: Date | null;
}

function mapRow(row: any): ChatMessage {
  return {
    id: row.id,
    requestId: row.request_id,
    senderRole: row.sender_role,
    senderId: row.sender_id,
    message: row.message,
    mediaUrl: row.media_url,
    sentAt: row.sent_at,
    readAt: row.read_at,
  };
}

export async function create(data: {
  requestId: string; senderRole: 'farmer' | 'vet'; senderId: string; message: string; mediaUrl?: string;
}): Promise<ChatMessage> {
  const id = newId();
  await pool.query(
    'INSERT INTO chat_messages (id, request_id, sender_role, sender_id, message, media_url) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.requestId, data.senderRole, data.senderId, data.message, data.mediaUrl ?? null]
  );
  const [rows] = await pool.query('SELECT * FROM chat_messages WHERE id = ?', [id]);
  return mapRow((rows as any[])[0]);
}

// Cursor-paginated history, newest first, then reversed by the caller for display.
export async function listByRequest(requestId: string, beforeId?: string, limit = 30): Promise<ChatMessage[]> {
  if (beforeId) {
    const [cursorRows] = await pool.query('SELECT sent_at FROM chat_messages WHERE id = ?', [beforeId]);
    const cursorSentAt = (cursorRows as any[])[0]?.sent_at;
    if (cursorSentAt) {
      const [rows] = await pool.query(
        'SELECT * FROM chat_messages WHERE request_id = ? AND sent_at < ? ORDER BY sent_at DESC LIMIT ?',
        [requestId, cursorSentAt, limit]
      );
      return (rows as any[]).map(mapRow);
    }
  }
  const [rows] = await pool.query(
    'SELECT * FROM chat_messages WHERE request_id = ? ORDER BY sent_at DESC LIMIT ?',
    [requestId, limit]
  );
  return (rows as any[]).map(mapRow);
}

// Latest single message per request — used for inbox preview
export async function latestByRequest(requestId: string): Promise<ChatMessage | null> {
  const [rows] = await pool.query(
    'SELECT * FROM chat_messages WHERE request_id = ? ORDER BY sent_at DESC LIMIT 1',
    [requestId]
  );
  const r = (rows as any[])[0];
  return r ? mapRow(r) : null;
}

// Batch: latest message for each of the given requestIds — for inbox list
export async function latestByRequestIds(requestIds: string[]): Promise<Map<string, ChatMessage>> {
  if (!requestIds.length) return new Map();
  const placeholders = requestIds.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT cm.* FROM chat_messages cm
     INNER JOIN (
       SELECT request_id, MAX(sent_at) AS max_sent_at
       FROM chat_messages
       WHERE request_id IN (${placeholders})
       GROUP BY request_id
     ) latest ON cm.request_id = latest.request_id AND cm.sent_at = latest.max_sent_at`,
    requestIds
  );
  const result = new Map<string, ChatMessage>();
  for (const r of rows as any[]) {
    const msg = mapRow(r);
    result.set(msg.requestId, msg);
  }
  return result;
}

// Batch: count unread messages sent by the opposite role for each request ID
export async function countUnreadByRequestIds(requestIds: string[], oppositeRole: 'farmer' | 'vet'): Promise<Map<string, number>> {
  if (!requestIds.length) return new Map();
  const placeholders = requestIds.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT request_id, COUNT(*) AS unread_count
     FROM chat_messages
     WHERE request_id IN (${placeholders}) AND sender_role = ? AND read_at IS NULL
     GROUP BY request_id`,
    [...requestIds, oppositeRole]
  );
  const result = new Map<string, number>();
  for (const r of rows as any[]) {
    result.set(r.request_id, Number(r.unread_count));
  }
  return result;
}

// Mark all unread messages in a request thread from opposite role as read
export async function markReadByRequest(requestId: string, currentRole: 'farmer' | 'vet'): Promise<void> {
  const oppositeRole = currentRole === 'farmer' ? 'vet' : 'farmer';
  await pool.query(
    'UPDATE chat_messages SET read_at = NOW() WHERE request_id = ? AND sender_role = ? AND read_at IS NULL',
    [requestId, oppositeRole]
  );
}

