import { NextRequest, NextResponse } from 'next/server';
import { getAdminReportsService } from '@/lib/booking/booking-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reports
 * Returns computed metrics from SQL RPC (or in-memory store fallback):
 * - KPIs: total requests, confirmed, pending, no-shows, seated, total guests
 * - 7-Day rolling guests bar chart
 * - Bookings by type breakdown
 * - Top pre-ordered dishes leaderboard
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || undefined;

    const reportsData = await getAdminReportsService({ restaurantId });

    return NextResponse.json(reportsData);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
        message_mr: 'अहवाल लोड करण्यात त्रुटी आली.',
        message_en: 'Failed to load admin reports.',
      },
      { status: 500 }
    );
  }
}
