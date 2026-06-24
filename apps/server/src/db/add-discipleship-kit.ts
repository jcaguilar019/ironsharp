import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./index.js";

// Additive, idempotent migration for the Discipleship Kit.
// Mirrors add-passage-context.ts: safe to run multiple times.

// ── Extend disciple_relationships ─────────────────────────────────────────────
await db.execute(sql`
  ALTER TABLE disciple_relationships
    ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE SET NULL;
`);
await db.execute(sql`
  ALTER TABLE disciple_relationships
    ADD COLUMN IF NOT EXISTS privacy_notice_accepted_at timestamptz;
`);

// ── Extend devotional_submissions (Q3) ────────────────────────────────────────
await db.execute(sql`
  ALTER TABLE devotional_submissions
    ADD COLUMN IF NOT EXISTS response3 text;
`);
await db.execute(sql`
  ALTER TABLE devotional_submissions
    ADD COLUMN IF NOT EXISTS q3_private boolean NOT NULL DEFAULT false;
`);

// ── New tables ────────────────────────────────────────────────────────────────
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS custom_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    discipleship_relationship_id uuid NOT NULL
      REFERENCES disciple_relationships(id) ON DELETE CASCADE,
    disciple_id text NOT NULL,
    question_text text NOT NULL,
    for_date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT custom_questions_unique UNIQUE (discipleship_relationship_id, for_date)
  );
`);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS flagged_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    discipleship_relationship_id uuid NOT NULL
      REFERENCES disciple_relationships(id) ON DELETE CASCADE,
    response_id uuid NOT NULL
      REFERENCES devotional_submissions(id) ON DELETE CASCADE,
    question_type text NOT NULL,
    flagged_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT flagged_responses_unique UNIQUE (discipleship_relationship_id, response_id, question_type)
  );
`);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS mailbox_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    discipleship_relationship_id uuid NOT NULL
      REFERENCES disciple_relationships(id) ON DELETE CASCADE,
    sender_id text NOT NULL,
    message_type text NOT NULL DEFAULT 'text',
    message_text text,
    audio_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz
  );
`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS idx_mailbox_messages_thread
    ON mailbox_messages (discipleship_relationship_id, created_at);
`);

// ── Verify ────────────────────────────────────────────────────────────────────
const cols = await db.execute(sql`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE (table_name = 'disciple_relationships' AND column_name IN ('group_id', 'privacy_notice_accepted_at'))
     OR (table_name = 'devotional_submissions' AND column_name IN ('response3', 'q3_private'))
  ORDER BY table_name, column_name;
`);
const tables = await db.execute(sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_name IN ('custom_questions', 'flagged_responses', 'mailbox_messages')
  ORDER BY table_name;
`);
console.log("New columns present:", cols.rows.map((r) => `${r.table_name}.${r.column_name}`));
console.log("New tables present:", tables.rows.map((r) => r.table_name));

await pool.end();
