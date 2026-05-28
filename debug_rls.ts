import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  const ws_id = '0831a504-d252-408d-ad9a-a1fb086fd1e0';
  const u_id = '4d2044fd-1e27-478f-a73a-e20d05aeea70';
  
  const { data, error } = await supabase.rpc('is_workspace_member', {
    p_workspace_id: ws_id,
    p_user_id: u_id
  });
  console.log('Result of is_workspace_member:', data, error);
}
run();
