import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface ClientPushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
  expirationTime?: number | null;
  userId?: string;
  role?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tokenNumber?: string;
  bookingId?: string;
  partySize?: number;
  timeSlot?: string;
  guestName?: string;
  tag?: string;
}

// Default Fallback VAPID keys for demo/local dev
const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BP2k7fQ6G6KbDcxQyzNfDwFt-hYuHJT_Ur6T40xKb4Luhfj6woxiLOFKl2mO3fwPbxshLAD7fcBiV1ZmtVEflio';

const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'jSTdWVFACnZK4U-WSga0VqkZE3cvyJ3og9a7I5WWKPw';

const DEFAULT_VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@shreeveg.com';

// Initialize web-push configuration once
try {
  webpush.setVapidDetails(
    DEFAULT_VAPID_SUBJECT,
    DEFAULT_VAPID_PUBLIC_KEY,
    DEFAULT_VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn('[Push Service] VAPID initialization note:', e);
}

// In-memory subscription store for Demo / Local environments
const inMemorySubscriptions = new Map<string, ClientPushSubscription>();

export function getVapidPublicKey(): string {
  return DEFAULT_VAPID_PUBLIC_KEY;
}

/**
 * Saves a web push subscription to memory and database (if active).
 */
export async function savePushSubscription(
  sub: ClientPushSubscription
): Promise<{ success: boolean; message: string }> {
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { success: false, message: 'Invalid subscription object' };
  }

  // 1. Save in memory store
  inMemorySubscriptions.set(sub.endpoint, sub);

  // 2. Try saving to Supabase if live
  const hasLiveSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('demo');

  if (hasLiveSupabase) {
    try {
      const supabase = createAdminClient();
      const rest = await supabase.from('restaurants').select('id').limit(1).single();
      const restaurantId = rest.data?.id;

      if (restaurantId) {
        await supabase.from('push_subscriptions').upsert(
          {
            restaurant_id: restaurantId,
            user_id: sub.userId || null,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
          { onConflict: 'endpoint' }
        );
      }
    } catch (err) {
      console.warn('[Push Service] Could not persist to DB push_subscriptions:', err);
    }
  }

  return { success: true, message: 'Push subscription stored successfully' };
}

/**
 * Removes a push subscription (e.g. on unsubscribe or 410 Gone)
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  inMemorySubscriptions.delete(endpoint);

  try {
    const supabase = createAdminClient();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch {
    // ignore
  }
}

/**
 * Returns all active push subscriptions
 */
export async function getAllPushSubscriptions(): Promise<ClientPushSubscription[]> {
  const result: ClientPushSubscription[] = Array.from(inMemorySubscriptions.values());

  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from('push_subscriptions').select('*');
    if (data && data.length > 0) {
      for (const row of data) {
        if (!inMemorySubscriptions.has(row.endpoint)) {
          result.push({
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
            userId: row.user_id,
          });
        }
      }
    }
  } catch {
    // live db not ready
  }

  return result;
}

/**
 * Sends Web Push Notification to all subscribed staff devices
 */
export async function broadcastNewBookingPush(
  payload: PushNotificationPayload
): Promise<{ sentCount: number; failedCount: number }> {
  const subscriptions = await getAllPushSubscriptions();
  let sentCount = 0;
  let failedCount = 0;

  const pushBody = JSON.stringify({
    title: payload.title || 'श्री प्युअर व्हेज: नवीन आरक्षण! 🔔',
    body:
      payload.body ||
      `टोकन #${payload.tokenNumber || 'SV-NEW'}: ${payload.guestName || 'ग्राहक'} (${payload.partySize || 2} लोक)`,
    url: payload.url || '/admin',
    tokenNumber: payload.tokenNumber,
    bookingId: payload.bookingId,
    tag: `booking-${payload.tokenNumber || Date.now()}`,
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        pushBody,
        {
          TTL: 60 * 60, // 1 hour TTL
          urgency: 'high',
        }
      );
      sentCount++;
    } catch (err: any) {
      failedCount++;
      // If subscription is expired or unsubscribed (HTTP 410 or 404), clean it up
      if (err.statusCode === 410 || err.statusCode === 404) {
        await removePushSubscription(sub.endpoint);
      }
      console.warn('[Push Service] Send failure to endpoint:', err.message);
    }
  }

  return { sentCount, failedCount };
}

/**
 * Sends a single test push notification to verify phone or browser reception
 */
export async function sendTestPushNotification(
  sub: ClientPushSubscription
): Promise<{ success: boolean; message: string }> {
  try {
    const testPayload = JSON.stringify({
      title: 'श्री प्युअर व्हेज — पुश चाचणी यशस्वी! ✅',
      body: 'आपल्या मोबाईलवर VAPID पुश सूचना यशस्वीरित्या सुरू झाल्या आहेत.',
      url: '/admin',
      tokenNumber: 'TEST-PUSH',
      tag: 'test-push-' + Date.now(),
    });

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      },
      testPayload,
      {
        TTL: 60,
        urgency: 'high',
      }
    );

    return { success: true, message: 'Test notification sent to device' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Push delivery failed' };
  }
}
