const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const regions = [
  'us-west-2',      // Oregon
  'ap-south-1',     // Mumbai
  'ap-northeast-1', // Tokyo
  'ap-northeast-3', // Osaka
  'me-central-1',   // UAE
  'af-south-1',     // Cape Town
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
  console.log('Testing remaining poolers...');

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Connecting to ${host}...`);

    const client = new Client({
      host,
      port: 5432,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      console.log(`✅ Connected successfully to ${host}!`);

      console.log('Running migration SQL...');
      await client.query(migrationSql);
      console.log('🎉 Migration SQL executed successfully!');

      await client.end();
      return; // Exit script since migration succeeded
    } catch (e) {
      console.error(`❌ Failed to connect/run on ${host}:`, e.message);
      try {
        await client.end();
      } catch (err) {}
    }
  }

  console.error('❌ Could not apply migration to any remaining region.');
}

run();
