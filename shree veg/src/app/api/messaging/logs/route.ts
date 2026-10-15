import { NextRequest, NextResponse } from 'next/server';
import { listMessageLogs } from '@/lib/messaging/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messaging/logs
 * Retrieves recent message logs from message_log table.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const logs = await listMessageLogs({ bookingId, limit });

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[API /messaging/logs] Error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
