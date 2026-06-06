import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

async function run() {
  const adminSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const emailA = `userA_${Date.now()}@example.com`;
  const emailB = `userB_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  console.log('Step 1: Creating User A and User B...');
  const { data: authA } = await adminSupabase.auth.signUp({ email: emailA, password });
  const { data: authB } = await adminSupabase.auth.signUp({ email: emailB, password });

  if (!authA.user || !authB.user) {
    console.error('Failed to create users');
    return;
  }
  const userA = authA.user;
  const userB = authB.user;
  console.log(`User A: ${userA.id}, User B: ${userB.id}`);

  // Create User A client
  const clientA = createClient(supabaseUrl, 'sb_publishable_5diVuOk4FV0J6LuUZJwM6w_oeVyDGW-', {
    auth: { persistSession: false }
  });
  await clientA.auth.signInWithPassword({ email: emailA, password });

  // Create User B client
  const clientB = createClient(supabaseUrl, 'sb_publishable_5diVuOk4FV0J6LuUZJwM6w_oeVyDGW-', {
    auth: { persistSession: false }
  });
  await clientB.auth.signInWithPassword({ email: emailB, password });

  // Fetch User A's default workspace
  const { data: workspacesA } = await clientA
    .from('workspaces')
    .select('id')
    .eq('owner_id', userA.id);

  if (!workspacesA || workspacesA.length === 0) {
    console.error('Failed to get User A workspace');
    return;
  }
  const workspaceIdA = workspacesA[0].id;
  console.log(`User A Workspace ID: ${workspaceIdA}`);

  // User A creates a workflow
  const { data: wfA } = await clientA
    .from('workflows')
    .insert({
      workspace_id: workspaceIdA,
      name: 'Shared Workflow',
      description: 'Shared',
      status: 'draft',
      created_by: userA.id
    })
    .select();

  if (!wfA || wfA.length === 0) {
    console.error('Failed to create workflow');
    return;
  }
  const workflowId = wfA[0].id;
  console.log(`Workflow ID: ${workflowId}`);

  // User A shares the workflow with User B as 'editor'
  console.log('Step 2: User A shares workflow with User B...');
  const { error: shareError } = await clientA
    .from('workflow_shares')
    .insert({
      workflow_id: workflowId,
      user_id: userB.id,
      role: 'editor',
      created_by: userA.id
    });

  if (shareError) {
    console.error('Failed to share workflow:', shareError);
    return;
  }
  console.log('Workflow shared successfully.');

  // User B tries to SELECT the workflow
  console.log('Step 3: User B attempts to SELECT the shared workflow...');
  const { data: selectB, error: selectBError } = await clientB
    .from('workflows')
    .select('*')
    .eq('id', workflowId);
  console.log('Select Result:', selectB, selectBError);

  // User B tries to UPDATE the workflow
  console.log('Step 4: User B attempts to UPDATE the shared workflow...');
  console.time('User B Update Time');
  const { data: updateB, error: updateBError } = await clientB
    .from('workflows')
    .update({
      board_data: { boardStrokes: [], boardBg: '#111' },
      updated_at: new Date().toISOString()
    })
    .eq('id', workflowId)
    .select();
  console.timeEnd('User B Update Time');

  if (updateBError) {
    console.error('❌ User B update failed:', updateBError.message, updateBError);
  } else {
    console.log('✅ User B update succeeded! Returned:', updateB);
  }
}

run().catch(console.error);
