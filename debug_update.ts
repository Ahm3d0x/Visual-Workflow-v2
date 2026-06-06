import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const email = `test_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const fullName = 'Test User';

  console.log(`Step 1: Signing up user: ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (authError || !authData.user) {
    console.error('Sign up failed:', authError);
    return;
  }
  const user = authData.user;
  console.log('Signed up as:', user.email, user.id);

  // Authenticate the client as the new user
  const userSupabase = createClient(supabaseUrl, 'sb_publishable_5diVuOk4FV0J6LuUZJwM6w_oeVyDGW-', {
    auth: { persistSession: false }
  });
  const { error: signInError } = await userSupabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('Sign in failed:', signInError);
    return;
  }
  console.log('Signed in successfully.');

  // Step 2: Get the default workspace created by the trigger
  console.log('Step 2: Fetching default workspace...');
  const { data: workspaces, error: wsError } = await userSupabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id);

  if (wsError || !workspaces || workspaces.length === 0) {
    console.error('Failed to get workspace:', wsError);
    return;
  }
  const workspaceId = workspaces[0].id;
  console.log('Workspace ID:', workspaceId);

  // Step 3: Insert a new workflow
  console.log('Step 3: Inserting workflow...');
  const { data: wfData, error: wfError } = await userSupabase
    .from('workflows')
    .insert({
      workspace_id: workspaceId,
      name: 'Test Workflow',
      description: 'Initial',
      status: 'draft',
      node_count: 0,
      created_by: user.id
    })
    .select();

  if (wfError || !wfData || wfData.length === 0) {
    console.error('Failed to insert workflow:', wfError);
    return;
  }
  const workflowId = wfData[0].id;
  console.log('Workflow created. ID:', workflowId);

  // Step 4: Update the workflow board_data (whiteboard save simulation)
  console.log('Step 4: Attempting to update workflow board_data...');
  const boardData = {
    boardStrokes: [
      { id: '1', tool: 'pen', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }], color: '#ff0000', width: 2 }
    ],
    boardBg: '#ffffff'
  };

  console.time('Update Duration');
  const { data: updateData, error: updateError } = await userSupabase
    .from('workflows')
    .update({
      board_data: boardData,
      updated_at: new Date().toISOString()
    })
    .eq('id', workflowId)
    .select();
  console.timeEnd('Update Duration');

  if (updateError) {
    console.error('❌ Update failed:', updateError.message, updateError);
  } else {
    console.log('✅ Update succeeded! Returned:', updateData);
  }
}

run().catch(console.error);
