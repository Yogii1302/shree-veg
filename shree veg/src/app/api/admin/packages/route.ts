import { NextRequest, NextResponse } from 'next/server';
import {
  listPackagesService,
  updatePackageService,
} from '@/lib/booking/booking-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/packages
 * Lists all group packages.
 */
export async function GET() {
  try {
    const packages = await listPackagesService();
    return NextResponse.json({ success: true, packages });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/packages
 * Updates package name, per-head price, minimum guests, and active status.
 * Enforces role restriction: Kitchen role is READ-ONLY (403 Forbidden).
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name_en, name_mr, price_per_head, min_guests, is_active, role } = body;

    const callerRole = role || req.headers.get('x-staff-role') || 'owner';

    if (callerRole === 'kitchen') {
      return NextResponse.json(
        {
          success: false,
          error_code: 'ROLE_RESTRICTED',
          message_mr: 'स्वयंपाकघर भूमिका: केवळ वाचनाची परवानगी आहे. पॅकेज बदलू शकत नाही.',
          message_en: 'Kitchen role is strictly read-only. Package changes forbidden.',
        },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing package id' },
        { status: 400 }
      );
    }

    const result = await updatePackageService(id, {
      name_en,
      name_mr,
      price_per_head,
      min_guests,
      is_active,
      callerRole,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update package' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      pkg: result.pkg,
      message_mr: 'पंगत थाळी पॅकेज यशस्वीरित्या अद्यतनित केले.',
      message_en: 'Group package updated successfully.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
