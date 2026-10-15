import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, MessageKind, MessageLanguage, BookingInput } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

/**
 * POST /api/messaging/send
 * Dispatches or generates a WhatsApp message using the single unified interface:
 * sendMessage(kind, booking, lang)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kind, booking, lang } = body as {
      kind: MessageKind;
      booking: BookingInput;
      lang?: MessageLanguage;
    };

    if (!kind || !booking) {
      return NextResponse.json(
        { success: false, error: 'Missing kind or booking in request body' },
        { status: 400 }
      );
    }

    const validKinds: MessageKind[] = [
      'guest_confirmed',
      'guest_rejected',
      'guest_reminder',
      'owner_new_booking',
    ];

    if (!validKinds.includes(kind)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid message kind: ${kind}. Must be one of: ${validKinds.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const preferredLang: MessageLanguage = lang === 'en' ? 'en' : 'mr';
    const result = await sendMessage(kind, booking, preferredLang);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[API /messaging/send] Error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
