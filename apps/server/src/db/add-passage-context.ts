import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./index.js";

// Additive, idempotent migration: per-day passage context column.
await db.execute(sql`ALTER TABLE devotional_days ADD COLUMN IF NOT EXISTS passage_context text;`);
const res = await db.execute(
  sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'devotional_days' AND column_name = 'passage_context';`
);
console.log("passage_context column present:", res.rows.length > 0);
await pool.end();
