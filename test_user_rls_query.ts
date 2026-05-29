import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseAnonKey = 'sb_publishable_5diVuOk4FV0J6LuUZJwM6w_oeVyDGW-';
const supabaseServiceKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function run() {
  const email = 'ahm3d.m.attia@gmail.com';
  const workspaceId = '0831a504-d252-408d-ad9a-a1fb086fd1e0'; // concord workspace

  console.log(`1. Generating OTP for ${email}...`);
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
  });

  if (linkErr || !linkData) {
    console.error('Failed to generate magic link:', linkErr);
    return;
  }

  const otp = linkData.properties.email_otp;
  console.log(`2. Verifying OTP ${otp}...`);
  const { data: authData, error: authErr } = await supabaseUser.auth.verifyOtp({
    email,
    token: otp,
    type: 'magiclink'
  });

  if (authErr || !authData.session) {
    console.error('Failed to verify OTP:', authErr);
    return;
  }

  const userToken = authData.session.access_token;
  console.log('3. Session verified successfully. Token retrieved!');

  // Now create an authenticated client using this user's token!
  const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  console.log('4. Performing RLS query on workspace_members...');
  const { data: members, error: queryErr } = await authenticatedClient
    .from('workspace_members')
    .select('role, joined_at, profiles:profiles!workspace_members_user_id_fkey(id, email, full_name, avatar_url)')
    .eq('workspace_id', workspaceId);

  if (queryErr) {
    console.error('QUERY FAILED:', queryErr);
  } else {
    console.log('QUERY SUCCESS! Returned members:');
    console.log(JSON.stringify(members, null, 2));
  }
}

run().catch(console.error);
