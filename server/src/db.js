import pg from 'pg';

const { Pool } = pg;

// Railway's internal host needs no SSL; the public proxy works without SSL too,
// but we allow a relaxed SSL toggle via PGSSL=require just in case.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false,
  max: 5,
});

export async function initSchema() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      display_name  text,
      current_level text NOT NULL DEFAULT 'A1',
      created_at    timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS progress (
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id    text NOT NULL,
      kind       text NOT NULL DEFAULT 'lesson',
      completed  boolean NOT NULL DEFAULT false,
      score      int,
      data       jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, item_id)
    );
  `);
}
