import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Admin client to bypass RLS in background system actions
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Enforce secret header checks in production viewports
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const now = new Date().toISOString();

    // 1. Select workspaces whose trials have expired
    const { data: expiredWorkspaces, error: fetchError } = await (supabaseAdmin
      .from('workspaces')
      .select('id, name, plan')
      .neq('plan', 'free')
      .lt('trial_ends_at', now) as unknown as Promise<{
        data: Array<{ id: string; name: string; plan: string }> | null;
        error: { message: string } | null;
      }>);

    if (fetchError) {
      throw new Error(`Failed to fetch expired workspaces: ${fetchError.message}`);
    }

    if (!expiredWorkspaces || expiredWorkspaces.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired trials detected.',
        downgraded: [],
      });
    }

    const downgradedIds: string[] = [];

    // 2. Process each workspace downgrade action
    for (const workspace of expiredWorkspaces) {
      // A. Update the workspace plan to 'free'
      const { error: updateError } = await (supabaseAdmin.from('workspaces') as unknown as {
        update: (arg: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
      })
        .update({ plan: 'free' })
        .eq('id', workspace.id);

      if (updateError) {
        console.error(`Failed to downgrade workspace ${workspace.id}:`, updateError.message);
        continue;
      }

      // B. Fetch all workflows belonging to this workspace to log system audit actions
      const { data: workflows } = await (supabaseAdmin
        .from('workflows')
        .select('id')
        .eq('workspace_id', workspace.id) as unknown as Promise<{ data: Array<{ id: string }> | null }>);

      if (workflows && workflows.length > 0) {
        const activities = workflows.map((wf) => ({
          workflow_id: wf.id,
          action: 'workspace_downgraded',
          meta: {
            previousPlan: workspace.plan,
            currentPlan: 'free',
            reason: 'trial_expiry',
            executedAt: now,
          },
        }));

        await (supabaseAdmin.from('workflow_activity') as unknown as {
          insert: (arg: Array<Record<string, unknown>>) => Promise<unknown>;
        })
          .insert(activities);
      }

      downgradedIds.push(workspace.id);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully downgraded ${downgradedIds.length} expired trial workspaces.`,
      downgraded: downgradedIds,
    });

  } catch (err: unknown) {
    console.error('Cron check-trials critical error:', err);
    return new NextResponse(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
