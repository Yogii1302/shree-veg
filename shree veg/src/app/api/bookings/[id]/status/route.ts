import { NextRequest, NextResponse } from 'next/server';
import {
  getBookingStatusService,
  updateBookingStatusService,
} from '@/lib/booking/booking-service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/bookings/[id]/status
 * Polls latest status for live confirmation screen.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const bookingId = params.id;
    const { found, booking } = await getBookingStatusService(bookingId);

    if (!found || !booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      token_number: booking.token_number,
      status: booking.status,
      guest_name: booking.guest_name,
      party_size: booking.party_size,
      slot_start: booking.slot_start,
      total_estimated_amount: booking.total_estimated_amount,
      rejection_reason: booking.rejection_reason,
      updated_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/bookings/[id]/status
 * Staff action to accept, reject, seat, mark no-show, or cancel booking.
 * Enforces role restriction (kitchen is read-only).
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const bookingId = params.id;
    const body = await req.json();
    const { status, rejection_reason, prep_time_mins, role } = body;

    // Check caller role (from body or header)
    const callerRole = role || req.headers.get('x-staff-role') || 'owner';

    if (callerRole === 'kitchen') {
      return NextResponse.json(
        {
          success: false,
          error_code: 'ROLE_RESTRICTED',
          message_mr: 'स्वयंपाकघर भूमिका: केवळ वाचनाची परवानगी आहे. बदल करू शकत नाही.',
          message_en: 'Kitchen role is strictly read-only. Action forbidden.',
        },
        { status: 403 }
      );
    }

    if (!['pending', 'confirmed', 'rejected', 'seated', 'no_show', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }

    const result = await updateBookingStatusService(
      bookingId,
      status,
      {
        rejectionReason: rejection_reason,
        prepTimeMins: prep_time_mins,
        callerRole,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: `Status updated to ${status}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
