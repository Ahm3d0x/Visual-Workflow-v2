const dns = require('dns').promises;

const projectRef = 'lwywlgdiplbyzbhbdgpp';
const hosts = [
  `db.${projectRef}.supabase.co`,
  `db.${projectRef}.supabase.net`,
  `${projectRef}.supabase.co`,
  // Try common pooler regions
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-eu-central-1.pooler.supabase.com`,
  `aws-0-ap-southeast-1.pooler.supabase.com`,
  `aws-0-us-west-1.pooler.supabase.com`,
  `aws-0-us-west-2.pooler.supabase.com`,
  `aws-0-ca-central-1.pooler.supabase.com`,
  `aws-0-eu-west-1.pooler.supabase.com`,
  `aws-0-eu-west-2.pooler.supabase.com`,
  `aws-0-eu-west-3.pooler.supabase.com`,
  `aws-0-sa-east-1.pooler.supabase.com`,
  `aws-0-ap-northeast-1.pooler.supabase.com`,
  `aws-0-ap-northeast-2.pooler.supabase.com`,
  `aws-0-ap-southeast-2.pooler.supabase.com`,
  `aws-0-eu-north-1.pooler.supabase.com`,
  `aws-0-me-central-1.pooler.supabase.com`,
];

async function resolveHosts() {
  console.log('Resolving DNS hosts...');
  for (const host of hosts) {
    try {
      const addresses = await dns.resolve4(host);
      console.log(`✅ ${host} -> ${addresses.join(', ')}`);
    } catch (e) {
      console.log(`❌ ${host} -> Failed: ${e.message}`);
    }
  }
}

resolveHosts();
