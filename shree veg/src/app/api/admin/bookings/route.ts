import { NextRequest, NextResponse } from 'next/server';
import { listAllBookingsService, simulateNewDemoBookingService } from '@/lib/booking/booking-service';
import { broadcastNewBookingPush } from '@/lib/push/push-service';

export const dynamic = 'force-dynamic';

function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * GET /api/admin/bookings?filter=pending|today|tomorrow|all
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get('filter') || 'all') as 'pending' | 'today' | 'tomorrow' | 'all';

    // 1. Fetch all bookings for calculation and filter
    const allResult = await listAllBookingsService({ filter: 'all' });
    const allBookings = allResult.bookings;

    const now = new Date();
    const todayStr = formatYYYYMMDD(now);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = formatYYYYMMDD(tomorrowDate);

    // Calculate summaries for Today and Tomorrow
    const todayBookings = allBookings.filter((b) => b.slot_start?.startsWith(todayStr));
    const tomorrowBookings = allBookings.filter((b) => b.slot_start?.startsWith(tomorrowStr));

    const todaySummary = {
      confirmedGuests: todayBookings
        .filter((b) => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.party_size, 0),
      waitingGuests: todayBookings
        .filter((b) => b.status === 'pending')
        .reduce((sum, b) => sum + b.party_size, 0),
      seatedGuests: todayBookings
        .filter((b) => b.status === 'seated')
        .reduce((sum, b) => sum + b.party_size, 0),
      totalTables: todayBookings.length,
      pendingCount: todayBookings.filter((b) => b.status === 'pending').length,
    };

    const tomorrowSummary = {
      confirmedGuests: tomorrowBookings
        .filter((b) => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.party_size, 0),
      waitingGuests: tomorrowBookings
        .filter((b) => b.status === 'pending')
        .reduce((sum, b) => sum + b.party_size, 0),
      totalTables: tomorrowBookings.length,
      pendingCount: tomorrowBookings.filter((b) => b.status === 'pending').length,
    };

    // Filter results according to request
    let filteredBookings = allBookings;
    if (filter === 'pending') {
      filteredBookings = allBookings.filter((b) => b.status === 'pending');
    } else if (filter === 'today') {
      filteredBookings = todayBookings;
    } else if (filter === 'tomorrow') {
      filteredBookings = tomorrowBookings;
    }

    return NextResponse.json({
      success: true,
      filter,
      bookings: filteredBookings,
      totalPending: allBookings.filter((b) => b.status === 'pending').length,
      todaySummary,
      tomorrowSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/bookings - Simulator trigger to create a new live booking
 */
export async function POST(req: NextRequest) {
  try {
    const simulated = await simulateNewDemoBookingService();

    // Trigger push notification
    broadcastNewBookingPush({
      title: 'श्री प्युअर व्हेज: नवीन आरक्षण! 🔔',
      body: `टोकन #${simulated.token_number}: ${simulated.guest_name} (${simulated.party_size} व्यक्ती)`,
      tokenNumber: simulated.token_number,
      bookingId: simulated.id,
      partySize: simulated.party_size,
      timeSlot: simulated.slot_start,
      guestName: simulated.guest_name,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      booking: simulated,
      message: 'Simulated booking created successfully!',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
