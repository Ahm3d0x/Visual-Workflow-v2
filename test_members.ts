import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function run() {
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, user_id, profiles:profiles!workspace_members_user_id_fkey(id, email, full_name, avatar_url)');

  console.log('MEMBERS RETRIEVED BY SERVICE ROLE:');
  if (error) {
    console.error('Error fetching members:', error);
  } else {
    console.log(JSON.stringify(members, null, 2));
  }
}

run().catch(console.error);
