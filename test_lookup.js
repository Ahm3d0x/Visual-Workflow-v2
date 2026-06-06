const dns = require('dns');

dns.lookup('db.lwywlgdiplbyzbhbdgpp.supabase.co', (err, address, family) => {
  if (err) {
    console.error('dns.lookup failed:', err.message);
  } else {
    console.log('dns.lookup address:', address, 'family:', family);
  }
});
