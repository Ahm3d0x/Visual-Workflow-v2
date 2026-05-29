import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log('--- START DIAGNOSTICS ---');
  
  // 1. Fetch all workspaces
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('*');
  console.log('Workspaces:', workspaces, wsError);

  if (workspaces && workspaces.length > 0) {
    const wsId = workspaces[0].id;
    console.log(`Using active workspace ID: ${wsId}`);

    // 2. Fetch workspace members
    const { data: members, error: memError } = await supabase
      .from('workspace_members')
      .select('*');
    console.log('Raw Workspace Members:', members, memError);

    // 3. Fetch profiles
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*');
    console.log('Profiles:', profiles, profError);

    // 4. Fetch joined query
    const { data: joined, error: joinError } = await supabase
      .from('workspace_members')
      .select('role, joined_at, profiles(id, email, full_name, avatar_url)')
      .eq('workspace_id', wsId);
    console.log('Joined members query result:', JSON.stringify(joined, null, 2), joinError);
  }
}
run();
