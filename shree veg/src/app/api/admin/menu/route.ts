import { NextRequest, NextResponse } from 'next/server';
import {
  listMenuItemsService,
  updateMenuItemService,
} from '@/lib/booking/booking-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/menu
 * Lists all menu items.
 */
export async function GET() {
  try {
    const items = await listMenuItemsService();
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/menu
 * Updates price, toggles sold-out, or edits names.
 * Enforces role restriction: Kitchen role is READ-ONLY (403 Forbidden).
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, price, is_sold_out, name_en, name_mr, role } = body;

    const callerRole = role || req.headers.get('x-staff-role') || 'owner';

    if (callerRole === 'kitchen') {
      return NextResponse.json(
        {
          success: false,
          error_code: 'ROLE_RESTRICTED',
          message_mr: 'स्वयंपाकघर भूमिका: केवळ वाचनाची परवानगी आहे. मेनू बदल करू शकत नाही.',
          message_en: 'Kitchen role is strictly read-only. Menu changes forbidden.',
        },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing menu item id' },
        { status: 400 }
      );
    }

    const result = await updateMenuItemService(id, {
      price,
      is_sold_out,
      name_en,
      name_mr,
      callerRole,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update menu item' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      item: result.item,
      message_mr: 'मेनू घटक यशस्वीरित्या अद्यतनित केला.',
      message_en: 'Menu item updated successfully.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
