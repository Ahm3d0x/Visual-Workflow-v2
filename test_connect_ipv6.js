const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const host = 'db.lwywlgdiplbyzbhbdgpp.supabase.co';
const password = 'Ah@135790101';
const user = 'postgres';
const database = 'postgres';

const migrationSql = fs.readFileSync(
  path.join(__dirname, 'supabase', 'migrations', '20260606000000_rls_hotfix_v4.sql'),
  'utf8'
);

async function run() {
  console.log(`Connecting to IPv6 host ${host} on port 5432...`);
  const client = new Client({
    host,
    port: 5432,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to database!');

    console.log('Running migration SQL...');
    await client.query(migrationSql);
    console.log('🎉 Migration SQL executed successfully!');

    await client.end();
  } catch (e) {
    console.error('❌ Failed to connect/run:', e.message);
    try {
      await client.end();
    } catch (err) {}
  }
}

run();
