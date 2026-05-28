import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function check() {
  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.error('usersErr', usersErr);
    return;
  }
  
  for (const user of users.users) {
    console.log(`\nUser: ${user.email} (${user.id})`);
    
    const { data: workspaces } = await supabase.from('workspaces').select('*').eq('owner_id', user.id);
    console.log('Workspaces owned:', workspaces);
    
    const { data: members } = await supabase.from('workspace_members').select('*').eq('user_id', user.id);
    console.log('Workspace Memberships:', members);
  }
}

check().catch(console.error);
