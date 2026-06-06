const https = require('https');

https.get('https://lwywlgdiplbyzbhbdgpp.supabase.co/rest/v1/', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error('Error fetching headers:', e);
});
