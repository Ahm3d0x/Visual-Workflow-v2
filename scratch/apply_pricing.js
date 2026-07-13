const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const targets = [
  { host: 'db.lwywlgdiplbyzbhbdgpp.supabase.co', port: 5432, user: 'postgres' },
  { host: 'db.lwywlgdiplbyzbhbdgpp.supabase.net', port: 5432, user: 'postgres' },
  { host: 'aws-0-me-central-1.pooler.supabase.com', port: 5432, user: 'postgres.lwywlgdiplbyzbhbdgpp' },
  { host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432, user: 'postgres.lwywlgdiplbyzbhbdgpp' },
  { host: '2a05:d014:1e9b:b301:20d2:ae60:8cc0:5b9d', port: 5432, user: 'postgres' },
];

const password = 'Ah@135790101';
const database = 'postgres';

const migrationSql = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260713000000_pricing_settings.sql'),
  'utf8'
);

async function run() {
  console.log('Starting migration execution for pricing settings...');

  for (const target of targets) {
    console.log(`Connecting to ${target.host}:${target.port} as ${target.user}...`);

    const client = new Client({
      host: target.host,
      port: target.port,
      database,
      user: target.user,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });

    try {
      await client.connect();
      console.log(`✅ Connected successfully to ${target.host}!`);

      console.log('Running migration SQL...');
      await client.query(migrationSql);
      console.log('🎉 Migration SQL executed successfully!');

      await client.end();
      return; // Exit script since migration succeeded
    } catch (e) {
      console.error(`❌ Failed to connect/run on ${target.host}:`, e.message);
      try {
        await client.end();
      } catch (err) {}
    }
  }

  console.error('❌ Could not apply migration to any region or direct host.');
  process.exit(1);
}

run();
