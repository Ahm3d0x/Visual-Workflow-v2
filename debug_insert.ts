import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  console.log('Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ahm3d.m.attia@gmail.com',
    password: 'Ah@135790101'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  const user = authData.user;
  console.log('Signed in as:', user.email, user.id);

  const workspaceId = '0831a504-d252-408d-ad9a-a1fb086fd1e0';

  console.log('Attempting insert into workflows WITH SELECT (.insert(...).select()) as authenticated user...');
  const { data: insertData, error: insertError } = await supabase
    .from('workflows')
    .insert({
      workspace_id: workspaceId,
      name: 'Test Workflow with Select ' + Date.now(),
      description: 'Created from debug script to verify RLS fix',
      status: 'draft',
      node_count: 0,
      created_by: user.id
    })
    .select();

  if (insertError) {
    console.error('❌ Insert with select failed:', insertError.message);
  } else {
    console.log('✅ Insert with select succeeded! Returned data:', insertData);
  }
}

run().catch(console.error);
