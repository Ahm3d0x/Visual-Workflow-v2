import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  const { data, error } = await supabase.rpc('get_policies');
  console.log('We need to query pg_policies using an arbitrary query, which postgrest cannot do. Instead, we can create an RPC to query it.');
}
run();
