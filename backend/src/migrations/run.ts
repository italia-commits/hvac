// ============================================================
// HVAC RenewIQ — Migration Runner
// Reads and executes SQL migration files against PostgreSQL
// ============================================================

import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { getPool, closePool } from '../config/database';

async function runMigrations(): Promise<void> {
  const pool = getPool();
  const migrationsDir = path.resolve(__dirname);

  // Ensure migrations tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Get migration files sorted by name
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    await closePool();
    return;
  }

  for (const file of files) {
    // Check if already run
    const { rowCount } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file]
    );

    if (rowCount && rowCount > 0) {
      console.log(`SKIP ${file} (already applied)`);
      continue;
    }

    console.log(`Running migration: ${file}`);
    const sql = readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
        [file.replace(/\.sql$/, ''), file]
      );
      console.log(`DONE ${file}`);
    } catch (error) {
      console.error(`FAILED ${file}:`, (error as Error).message);
      await closePool();
      process.exit(1);
    }
  }

  console.log('All migrations complete.');
  await closePool();
}

runMigrations().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
