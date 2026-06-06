const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const regions = [
  'eu-central-1', // Frankfurt
  'us-east-1',    // N. Virginia
  'us-west-2',    // Oregon
  'ap-southeast-1', // Singapore
];

const password = 'Ah@135790101';
const projectRef = 'lwywlgdiplbyzbhbdgpp';
const user = `postgres.${projectRef}`;
const database = 'postgres';

const migrationSql = fs.readFileSync(
  path.join(__dirname, 'supabase', 'migrations', '20260606000000_rls_hotfix_v4.sql'),
  'utf8'
);

async function run() {
  console.log('Testing poolers on port 6543...');

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Connecting to ${host}:6543...`);

    const client = new Client({
      host,
      port: 6543,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      console.log(`✅ Connected successfully to ${host}:6543!`);

      console.log('Running migration SQL...');
      await client.query(migrationSql);
      console.log('🎉 Migration SQL executed successfully!');

      await client.end();
      return; // Exit script since migration succeeded
    } catch (e) {
      console.error(`❌ Failed on ${host}:6543:`, e.message);
      try {
        await client.end();
      } catch (err) {}
    }
  }

  console.error('❌ Could not apply migration on port 6543.');
}

run();
