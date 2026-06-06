const dns = require('dns').promises;

async function check() {
  const host = 'db.lwywlgdiplbyzbhbdgpp.supabase.co';
  try {
    const cnames = await dns.resolveCname(host);
    console.log('CNAMEs:', cnames);
    if (cnames.length > 0) {
      const addresses = await dns.resolve4(cnames[0]);
      console.log('A records for CNAME:', addresses);
    }
  } catch (e) {
    console.error('Failed CNAME resolve:', e.message);
  }
}
check();
