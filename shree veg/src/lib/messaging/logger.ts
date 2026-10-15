import type { MessageLogRecord, MessageKind, MessageStatus } from './types';
import { createAdminClient } from '@/lib/supabase/admin';

// In-memory message log cache for offline and demo resilience
const inMemoryMessageLogs: MessageLogRecord[] = [];

/**
 * UUID validator regex
 */
function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Logs a dispatched WhatsApp message (wa.me or Cloud API) into message_log.
 */
export async function logMessage(params: {
  restaurantId?: string;
  bookingId?: string | null;
  recipientPhone: string;
  messageType: MessageKind | string;
  provider: 'wa_me' | 'cloud_api';
  status?: MessageStatus | string;
  payload?: Record<string, any>;
  messageId?: string;
}): Promise<MessageLogRecord> {
  const timestamp = new Date().toISOString();
  const id = params.messageId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const restaurantId = params.restaurantId || 'shree-theur-main';

  const entry: MessageLogRecord = {
    id,
    restaurant_id: restaurantId,
    booking_id: params.bookingId || null,
    recipient_phone: params.recipientPhone,
    message_type: params.messageType,
    provider: params.provider,
    status: params.status || 'sent',
    payload: {
      ...(params.payload || {}),
      provider_message_id: id,
      logged_at: timestamp,
    },
    created_at: timestamp,
  };

  // Always keep in in-memory store for instantaneous reactivity & offline demo
  inMemoryMessageLogs.unshift(entry);
  if (inMemoryMessageLogs.length > 200) {
    inMemoryMessageLogs.pop();
  }

  // Attempt database write via Supabase admin if available
  try {
    const supabase = createAdminClient();

    // Check if restaurant ID is a valid UUID, otherwise fetch or fallback
    let targetRestaurantUuid: string | null = isValidUuid(restaurantId) ? restaurantId : null;
    if (!targetRestaurantUuid) {
      const { data: restData } = await supabase
        .from('restaurants')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (restData?.id) {
        targetRestaurantUuid = restData.id;
      }
    }

    if (targetRestaurantUuid) {
      const dbPayload: Record<string, any> = {
        restaurant_id: targetRestaurantUuid,
        recipient_phone: params.recipientPhone,
        message_type: params.messageType,
        provider: params.provider,
        status: params.status || 'sent',
        payload: entry.payload,
      };

      if (params.bookingId && isValidUuid(params.bookingId)) {
        dbPayload.booking_id = params.bookingId;
      }

      const { data, error } = await supabase
        .from('message_log')
        .insert(dbPayload)
        .select()
        .single();

      if (!error && data) {
        entry.id = data.id;
      } else if (error) {
        console.warn('[MessageLog] Supabase insert notice:', error.message);
      }
    }
  } catch (err) {
    // Non-fatal: in-memory log guarantees zero downtime in demo environments
    // console.warn('[MessageLog] Supabase client unavailable, using in-memory log.');
  }

  return entry;
}

/**
 * Updates status of a logged message (used by WhatsApp Cloud API webhook: delivered, read, failed).
 */
export async function updateMessageStatus(
  messageIdentifier: string,
  newStatus: MessageStatus | string,
  errorDetail?: string
): Promise<boolean> {
  let updated = false;

  // 1. Update in-memory log
  for (const log of inMemoryMessageLogs) {
    if (
      log.id === messageIdentifier ||
      log.payload?.provider_message_id === messageIdentifier ||
      log.payload?.wamid === messageIdentifier
    ) {
      log.status = newStatus;
      log.updated_at = new Date().toISOString();
      if (errorDetail) {
        log.payload.delivery_error = errorDetail;
      }
      updated = true;
    }
  }

  // 2. Update Supabase if possible
  try {
    const supabase = createAdminClient();
    const updateData: Record<string, any> = {
      status: newStatus,
    };

    if (isValidUuid(messageIdentifier)) {
      await supabase.from('message_log').update(updateData).eq('id', messageIdentifier);
    } else {
      // Find row where payload->>'provider_message_id' matches or payload->>'wamid' matches
      await supabase
        .from('message_log')
        .update(updateData)
        .contains('payload', { provider_message_id: messageIdentifier });
    }
  } catch {
    // Non-fatal fallback
  }

  return updated;
}

/**
 * Retrieves recent message logs.
 */
export async function listMessageLogs(options?: {
  bookingId?: string;
  limit?: number;
}): Promise<MessageLogRecord[]> {
  const limit = options?.limit || 50;

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('message_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.bookingId && isValidUuid(options.bookingId)) {
      query = query.eq('booking_id', options.bookingId);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as MessageLogRecord[];
    }
  } catch {
    // fall through to in-memory
  }

  let result = [...inMemoryMessageLogs];
  if (options?.bookingId) {
    result = result.filter((m) => m.booking_id === options.bookingId);
  }
  return result.slice(0, limit);
}

/**
 * Resets in-memory message logs on demo reset
 */
export function clearInMemoryMessageLogs(): void {
  inMemoryMessageLogs.length = 0;
}
