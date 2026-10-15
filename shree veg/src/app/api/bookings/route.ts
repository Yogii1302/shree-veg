import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import {
  createBookingService,
  getDateRules,
  getSlotAvailability,
  listMenuItemsService,
  listPackagesService,
  listDateRulesService,
  DEFAULT_MENU_ITEMS,
  DEFAULT_PACKAGES,
  CreateBookingInput,
} from '@/lib/booking/booking-service';
import { broadcastNewBookingPush } from '@/lib/push/push-service';
import { sendMessage } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings?date=YYYY-MM-DD&party_size=4
 * Returns date rules, menu items, packages, and calculated slot availability.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const partySize = parseInt(searchParams.get('party_size') || '2', 10);

    const dateRules = await listDateRulesService();
    const slots = getSlotAvailability(date, partySize);
    const menuItems = await listMenuItemsService();
    const packages = await listPackagesService();

    return NextResponse.json({
      success: true,
      restaurant: {
        name: 'Shree Pure Veg (श्री प्युअर व्हेज)',
        phone: '+91 98765 43210',
        location: 'Theur Phata, Kunjirwadi, Pune-Solapur Highway (Pune 412201)',
      },
      dateRules,
      slots,
      menuItems,
      packages,
      groupPackages: packages,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch booking data', error: msg },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Runs transactional create_booking with honeypot and rate limiting.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. IP identification for rate limiting
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    // 2. Parse payload
    const body: CreateBookingInput = await req.json();

    // 3. Simple Rate Limiting (Combined IP + phone)
    const isDemoBypass =
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true' &&
      (req.headers.get('x-demo-simulation') === 'true' || req.headers.get('x-staff-role') === 'owner');

    if (!isDemoBypass) {
      const rateLimitKey = `${ip}_${(body.guest_phone || '').slice(-4)}`;
      const rateCheck = checkRateLimit(rateLimitKey, 6, 5 * 60 * 1000);

      if (!rateCheck.success) {
        return NextResponse.json(
          {
            success: false,
            error_code: 'RATE_LIMIT_EXCEEDED',
            message_mr: 'वारंवार विनंत्या आल्याने तात्पुरते थांबवले आहे. कृपया ५ मिनिटांनी पुन्हा प्रयत्न करा.',
            message_en: 'Too many requests. Please wait 5 minutes before trying again.',
            reset_in_seconds: rateCheck.resetInSeconds,
          },
          { status: 429 }
        );
      }
    }

    // 4. Honeypot check
    if (body.honeypot && body.honeypot.trim().length > 0) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'BOT_DETECTED',
          message_mr: 'अवैध विनंती आढळली.',
          message_en: 'Bot submission detected.',
        },
        { status: 400 }
      );
    }

    // 5. Execute transactional booking
    const result = await createBookingService(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // 6. Asynchronously broadcast Web Push to all subscribed staff devices
    broadcastNewBookingPush({
      title: 'श्री प्युअर व्हेज: नवीन आरक्षण! 🔔',
      body: `टोकन #${result.token_number}: ${body.guest_name} (${body.party_size} व्यक्ती, ${body.slot_start?.split('T')[1]?.substring(0, 5) || ''})`,
      tokenNumber: result.token_number,
      bookingId: result.booking_id,
      partySize: body.party_size,
      timeSlot: body.slot_start,
      guestName: body.guest_name,
    }).catch((pushErr) => {
      console.warn('[Push] Background push error:', pushErr);
    });

    // 7. Dispatch Owner Alert / Log in message_log
    sendMessage(
      'owner_new_booking',
      {
        id: result.booking_id,
        tokenNumber: result.token_number,
        guestName: body.guest_name,
        guestPhone: body.guest_phone,
        partySize: body.party_size,
        slotStart: body.slot_start,
        bookingType: body.type,
        notes: body.notes,
        totalEstimatedAmount: result.total_estimated_amount,
      },
      'mr'
    ).catch((msgErr) => {
      console.warn('[Messaging] Owner alert log note:', msgErr);
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error_code: 'SERVER_ERROR',
        message_mr: 'आरक्षण नोंदवताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.',
        message_en: 'A server error occurred while creating booking. Please try again.',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
