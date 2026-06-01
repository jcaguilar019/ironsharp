import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import { schema } from "./schema.js";

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy apps/server/.env.example to .env and add your Neon connection string."
  );
}

// Neon requires SSL. node-postgres reads sslmode from the URL, but we set it
// explicitly so the server also works against a plain local Postgres in dev.
export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
