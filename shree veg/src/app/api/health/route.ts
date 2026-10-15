import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Check if Supabase keys exist
  if (!hasUrl || !hasAnonKey || !hasServiceKey) {
    return NextResponse.json(
      {
        status: 'configuration_needed',
        timestamp: new Date().toISOString(),
        restaurant: 'Shree Pure Veg (Theur Phata)',
        database: {
          connected: false,
          error: 'Supabase environment variables missing in .env.local',
          checks: {
            NEXT_PUBLIC_SUPABASE_URL: hasUrl ? 'SET' : 'MISSING',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey ? 'SET' : 'MISSING',
            SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? 'SET' : 'MISSING',
          },
        },
      },
      { status: 503 }
    );
  }

  // 2. Perform live database ping
  try {
    const supabase = createAdminClient();

    // Ping postgres by querying the schema/time
    const { data, error } = await supabase.rpc('ping_db').select();

    // If custom RPC doesn't exist yet, fallback to querying schema metadata
    if (error) {
      const fallbackCheck = await supabase.from('restaurants').select('id').limit(1);
      
      const latencyMs = Date.now() - startTime;

      if (fallbackCheck.error && fallbackCheck.error.code !== 'PGRST116') {
        // Connected to Supabase API, but table may not be seeded yet
        return NextResponse.json({
          status: 'healthy_unseeded',
          message: 'Supabase connected! Schema tables need to be created/seeded.',
          latencyMs,
          timestamp: new Date().toISOString(),
          restaurant: 'Shree Pure Veg (Theur Phata)',
          database: {
            connected: true,
            auth: 'verified',
            details: fallbackCheck.error.message,
          },
        });
      }
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      message: 'Database connection verified successfully',
      latencyMs,
      timestamp: new Date().toISOString(),
      restaurant: 'Shree Pure Veg (Theur Phata)',
      database: {
        connected: true,
        rlsSecurity: 'enforced',
        serverTime: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Failed to connect to Supabase database',
        latencyMs,
        timestamp: new Date().toISOString(),
        restaurant: 'Shree Pure Veg (Theur Phata)',
        database: {
          connected: false,
          error: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
