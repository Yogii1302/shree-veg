import { NextRequest, NextResponse } from 'next/server';
import {
  listDateRulesService,
  setDateRuleService,
  removeDateRuleService,
} from '@/lib/booking/booking-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/date-rules
 * Returns active date rules.
 */
export async function GET() {
  try {
    const rules = await listDateRulesService();
    return NextResponse.json({ success: true, rules });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/admin/date-rules
 * Sets a date as blocked or festival.
 * Enforces role restriction: Kitchen role is READ-ONLY (403 Forbidden).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, kind, note_mr, note_en, role } = body;

    const callerRole = role || req.headers.get('x-staff-role') || 'owner';

    if (callerRole === 'kitchen') {
      return NextResponse.json(
        {
          success: false,
          error_code: 'ROLE_RESTRICTED',
          message_mr: 'स्वयंपाकघर भूमिका: केवळ वाचनाची परवानगी आहे. तारीख नियम बदलू शकत नाही.',
          message_en: 'Kitchen role is strictly read-only. Date rule changes forbidden.',
        },
        { status: 403 }
      );
    }

    if (!date || !['blocked', 'festival'].includes(kind)) {
      return NextResponse.json(
        { success: false, error: 'Valid date and kind (blocked or festival) required' },
        { status: 400 }
      );
    }

    const result = await setDateRuleService(date, kind, note_mr, note_en, callerRole);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to set date rule' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      rule: result.rule,
      message_mr:
        kind === 'festival'
          ? `तारीख ${date} सण दिवस म्हणून घोषित केली (मर्यादित १२ जागा/स्लॉट, टेबल कमाल १०).`
          : `तारीख ${date} यशस्वीरित्या ब्लॉक केली (बुकिंग बंद).`,
      message_en:
        kind === 'festival'
          ? `Date ${date} marked as Festival Day (limited 12 seats/slot, max table size 10).`
          : `Date ${date} successfully blocked for bookings.`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/date-rules
 * Resets a date to normal day (removes blocked/festival rule).
 * Enforces role restriction: Kitchen role is READ-ONLY (403 Forbidden).
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, role } = body;

    const callerRole = role || req.headers.get('x-staff-role') || 'owner';

    if (callerRole === 'kitchen') {
      return NextResponse.json(
        {
          success: false,
          error_code: 'ROLE_RESTRICTED',
          message_mr: 'स्वयंपाकघर भूमिका: केवळ वाचनाची परवानगी आहे.',
          message_en: 'Kitchen role is strictly read-only.',
        },
        { status: 403 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Missing date to reset' },
        { status: 400 }
      );
    }

    const result = await removeDateRuleService(date, callerRole);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to remove date rule' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message_mr: `तारीख ${date} सामान्य दिवस म्हणून पूर्ववत केली (३० जागा/स्लॉट, टेबल कमाल १२).`,
      message_en: `Date ${date} restored to normal day (30 seats/slot, max table size 12).`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
