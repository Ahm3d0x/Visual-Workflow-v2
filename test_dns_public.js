const dns = require('dns').promises;

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function check() {
  const host = 'db.lwywlgdiplbyzbhbdgpp.supabase.com';
  console.log(`Resolving ${host} using public DNS (8.8.8.8)...`);
  try {
    const records = await dns.resolveAny(host);
    console.log('✅ Resolved records:', JSON.stringify(records, null, 2));
  } catch (e) {
    console.error('❌ Failed to resolve:', e.message);
  }
}
check();
