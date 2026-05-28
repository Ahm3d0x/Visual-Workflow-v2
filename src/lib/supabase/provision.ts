import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Admin client using service role key to bypass RLS for lazy provisioning of missing workspaces
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SupabaseTableHelper {
  insert: (arg: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
}

interface SupabaseWorkspaceHelper {
  insert: (arg: Record<string, unknown>) => {
    select: (cols: string) => {
      single: () => Promise<{
        data: { id: string } | null;
        error: { message: string } | null;
      }>;
    };
  };
}

export async function provisionWorkspaceIfNeeded(
  userId: string,
  email: string,
  fullName: string | null
) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isPlaceholderKey = !serviceRoleKey || serviceRoleKey.includes('placeholder') || serviceRoleKey.length < 20;

  if (isPlaceholderKey) {
    console.warn(
      '⚠️ \x1b[33m[Supabase Provisioning Warning]\x1b[0m\n' +
      'SUPABASE_SERVICE_ROLE_KEY is missing or configured as a placeholder in .env.local.\n' +
      'To enable automatic workspace provisioning for early-signup accounts, please copy your actual service_role key from your Supabase Dashboard (Settings > API) and paste it into your .env.local file.\n'
    );
    return;
  }

  try {
    // 1. Check if a valid, existing workspace membership already exists for this user
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, workspaces:workspaces(id)')
      .eq('user_id', userId);

    const validMemberships = membership
      ? membership.filter((m) => (m as unknown as { workspaces: { id: string } | null }).workspaces !== null)
      : [];

    if (validMemberships.length > 0) {
      return; // A valid workspace membership already exists
    }

    console.log(`Lazy provisioning workspace for user ${userId}...`);

    // 2. Ensure profile exists
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      await (supabaseAdmin.from('profiles') as unknown as SupabaseTableHelper).insert({
        id: userId,
        email,
        full_name: fullName,
      });
    }

    // 3. Ensure user preferences exist
    const { data: prefs } = await supabaseAdmin
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!prefs) {
      await (supabaseAdmin.from('user_preferences') as unknown as SupabaseTableHelper).insert({
        user_id: userId,
      });
    }

    // 4. Create new default workspace
    const workspaceName = `${fullName || email.split('@')[0]}'s Workspace`;
    const { data: workspace, error: wsError } = await (
      supabaseAdmin.from('workspaces') as unknown as SupabaseWorkspaceHelper
    )
      .insert({
        name: workspaceName,
        owner_id: userId,
        plan: 'legend',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (wsError || !workspace) {
      console.error('Failed to insert workspace inside provisionWorkspaceIfNeeded:', wsError?.message);
      return;
    }

    const workspaceId = workspace.id;

    // 5. Add user as owner inside workspace_members
    await (supabaseAdmin.from('workspace_members') as unknown as SupabaseTableHelper).insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: 'owner',
    });

    // 6. Create default trial subscription record
    await (supabaseAdmin.from('subscriptions') as unknown as SupabaseTableHelper).insert({
      workspace_id: workspaceId,
      plan: 'legend',
      status: 'trialing',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    console.log(`Successfully lazy-provisioned workspace ${workspaceId} for user ${userId}.`);
  } catch (err) {
    console.error('Critical failure in lazy-provisioning workspace:', err);
  }
}

