const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const regions = [
  'eu-central-1', // Frankfurt
  'eu-west-3',    // Paris
  'eu-west-1',    // Ireland
  'eu-west-2',    // London
  'us-east-1',    // N. Virginia
  'us-west-1',    // N. California
  'ap-southeast-1', // Singapore
  'ca-central-1',   // Canada
  'sa-east-1',      // Sao Paulo
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-southeast-2', // Sydney
  'eu-north-1',     // Stockholm
  'us-east-2',      // Ohio
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
  console.log('Starting migration execution...');

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

  console.error('❌ Could not apply migration to any region.');
}

run();
