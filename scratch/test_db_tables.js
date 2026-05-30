const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lwywlgdiplbyzbhbdgpp.supabase.co';
const supabaseKey = 'sb_secret_EOUGV24S31lrafAvrtfovQ_J1W_ydJS';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    const { data, error } = await supabase
      .from('ai_requests')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying ai_requests:', error);
    } else {
      console.log('Successfully queried ai_requests! Data sample:', data);
    }
  } catch (err) {
    console.error('Exception querying ai_requests:', err);
  }

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying subscriptions:', error);
    } else {
      console.log('Successfully queried subscriptions! Data sample:', data);
    }
  } catch (err) {
    console.error('Exception querying subscriptions:', err);
  }
}

checkTables();
