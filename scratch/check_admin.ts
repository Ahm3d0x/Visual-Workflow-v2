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
  // Query profiles table
  const { data: profiles, error } = await supabase.from('profiles').select('*').limit(5);
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log('Profiles structure sample:', profiles[0] ? Object.keys(profiles[0]) : 'no profiles found');
  console.log('Profiles data:', profiles);
}

check().catch(console.error);
