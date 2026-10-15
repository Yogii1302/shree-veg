import { NextRequest, NextResponse } from 'next/server';
import { updateMessageStatus, logMessage } from '@/lib/messaging/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/webhook/whatsapp
 * Meta WhatsApp Cloud API Webhook Verification Endpoint.
 * Validates the hub.verify_token and returns the hub.challenge.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const expectedToken =
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'shree_veg_webhook_verify_secret';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WhatsApp Webhook] Verification successful!');
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.warn('[WhatsApp Webhook] Token verification failed:', { mode, token });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/webhook/whatsapp
 * Meta WhatsApp Cloud API Event & Status Updates.
 * Handles delivery statuses: sent, delivered, read, failed, and updates message_log.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify object structure
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          const value = change.value;
          if (!value) continue;

          // 1. Process Message Status Updates (sent, delivered, read, failed)
          if (Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              const messageId = statusObj.id; // e.g., wamid.HBg...
              const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
              const errorDetail = statusObj.errors?.[0]?.title;

              console.log(
                `[WhatsApp Webhook] Status update for ${messageId}: ${status}`
              );

              await updateMessageStatus(messageId, status, errorDetail);
            }
          }

          // 2. Process Inbound Messages (if customer replies on WhatsApp)
          if (Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const senderPhone = msg.from;
              const textBody = msg.text?.body || msg.type;

              console.log(
                `[WhatsApp Webhook] Inbound message from ${senderPhone}: ${textBody}`
              );

              // Log incoming customer message in message_log for staff record
              await logMessage({
                recipientPhone: senderPhone,
                messageType: 'customer_inbound_reply',
                provider: 'cloud_api',
                status: 'read',
                messageId: msg.id,
                payload: {
                  inbound: true,
                  text: textBody,
                  type: msg.type,
                  timestamp: msg.timestamp,
                },
              });
            }
          }
        }
      }

      return NextResponse.json({ success: true, status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Not a whatsapp_business_account' }, { status: 404 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[WhatsApp Webhook] Handler error:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
