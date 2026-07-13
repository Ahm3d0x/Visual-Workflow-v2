const dns = require('dns');

dns.lookup('google.com', (err, address, family) => {
  if (err) {
    console.error('google.com lookup failed:', err.message);
  } else {
    console.log('google.com address:', address, 'family:', family);
  }
});
