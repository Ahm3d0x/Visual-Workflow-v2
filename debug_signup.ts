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

  console.log(`Attempting signup with email: ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  console.log('Signup Result:', data, error);
}

run().catch(console.error);
