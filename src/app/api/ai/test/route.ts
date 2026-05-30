import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const geminiKey = process.env.GEMINI_API_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const status = {
      authenticated: !!user,
      userId: user?.id || null,
      authError: authError?.message || null,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `Configured (length: ${supabaseUrl.length})` : 'MISSING',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? `Configured (starts with: ${anonKey.substring(0, 10)}..., length: ${anonKey.length})` : 'MISSING',
        GEMINI_API_KEY: geminiKey 
          ? `Configured (starts with: ${geminiKey.substring(0, 7)}..., length: ${geminiKey.length})` 
          : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey 
          ? `Configured (starts with: ${serviceRoleKey.substring(0, 7)}..., length: ${serviceRoleKey.length})` 
          : 'MISSING',
      }
    };

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
