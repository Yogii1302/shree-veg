import { NextRequest, NextResponse } from 'next/server';
import { resetDemoDataService } from '@/lib/booking/booking-service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/demo/reset
 * Owner-only endpoint to reset demo data back to pristine seed state.
 * Calls Supabase stored procedure reset_demo() and resets in-memory mock engine.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Role verification: Owner-only guard
    const staffRoleHeader = req.headers.get('x-staff-role');

    // Also check Supabase session if active
    let isOwner = staffRoleHeader === 'owner';
    try {
      const supabase = createServerSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('staff_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        if (profile?.role === 'owner') {
          isOwner = true;
        } else if (profile && profile.role !== 'owner') {
          isOwner = false;
        }
      }
    } catch {
      // If server Supabase is unconfigured or offline, rely on verified staffRoleHeader
    }

    if (!isOwner) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'FORBIDDEN',
          message_mr: 'फक्त हॉटेल मालक (Owner) डेमो डेटा पूर्ववत करू शकतात.',
          message_en: 'Only the restaurant owner has permission to reset demo data.',
        },
        { status: 403 }
      );
    }

    // 2. Execute Demo Reset
    const result = await resetDemoDataService();

    return NextResponse.json({
      success: true,
      message_mr: 'डेमो डेटा आणि दैनंदिन टोकन्स यशस्वीरित्या पूर्ववत केले!',
      message_en: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error_code: 'SERVER_ERROR',
        message_mr: 'डेमो डेटा रीसेट करताना त्रुटी आली.',
        message_en: 'Failed to reset demo data.',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
