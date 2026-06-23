import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { devotionalPlans, devotionalDays } from "./schema.js";
import { PLANS } from "./seed-data.js";

// Push edited day content from seed-data.ts into the live DB: reflection,
// reflectionQ1/Q2, passageContext, and studyNotes. seed.ts skips already-seeded
// plans, so it can't update existing content — this can. Pass plan titles to
// limit scope; no args syncs every plan.
//   npx tsx src/db/sync-questions.ts "Faith That Shows Up"
const titles = process.argv.slice(2);

async function run() {
  const targets = PLANS.filter((p) => titles.length === 0 || titles.includes(p.title));
  if (targets.length === 0) {
    console.log("No matching plans.", titles.length ? `(filters: ${titles.join(", ")})` : "");
    return;
  }

  for (const plan of targets) {
    const [row] = await db
      .select({ id: devotionalPlans.id })
      .from(devotionalPlans)
      .where(eq(devotionalPlans.title, plan.title))
      .limit(1);

    if (!row) {
      console.log(`   • "${plan.title}" not in DB — skipping.`);
      continue;
    }

    let n = 0;
    for (const d of plan.days) {
      await db
        .update(devotionalDays)
        .set({
          reflection: d.reflection ?? null,
          reflectionQ1: d.reflectionQ1,
          reflectionQ2: d.reflectionQ2,
          passageContext: d.passageContext ?? null,
          studyNotes: (d.studyNotes ?? []) as never,
        })
        .where(and(eq(devotionalDays.planId, row.id), eq(devotionalDays.dayNumber, d.dayNumber)));
      n++;
    }
    console.log(`   ✓ "${plan.title}" — synced content for ${n} days.`);
  }
}

run()
  .catch((err) => {
    console.error("❌ Sync failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
