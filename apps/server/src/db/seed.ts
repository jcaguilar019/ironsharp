import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { devotionalPlans, devotionalDays } from "./schema.js";

type DaySeed = {
  dayNumber: number;
  chapter: string;
  theme?: string;
  reflectionQ1: string;
  reflectionQ2: string;
};

type PlanSeed = {
  title: string;
  subtitle?: string;
  category: string;
  totalDays: number;
  description: string;
  days: DaySeed[];
};

const PLANS: PlanSeed[] = [
  // Plans are added here as they are written and approved.
];

async function seed() {
  if (PLANS.length === 0) {
    console.log("No plans to seed.");
    return;
  }

  console.log("🌱 Seeding devotional plans…");
  for (const plan of PLANS) {
    const existing = await db
      .select({ id: devotionalPlans.id })
      .from(devotionalPlans)
      .where(eq(devotionalPlans.title, plan.title))
      .limit(1);

    if (existing.length > 0) {
      console.log(`   • "${plan.title}" already seeded — skipping.`);
      continue;
    }

    const [inserted] = await db
      .insert(devotionalPlans)
      .values({
        title: plan.title,
        subtitle: plan.subtitle,
        category: plan.category,
        totalDays: plan.totalDays,
        description: plan.description,
      })
      .returning({ id: devotionalPlans.id });

    if (!inserted) throw new Error(`Failed to insert plan ${plan.title}`);

    await db.insert(devotionalDays).values(
      plan.days.map((d) => ({
        planId: inserted.id,
        dayNumber: d.dayNumber,
        chapter: d.chapter,
        theme: d.theme,
        reflectionQ1: d.reflectionQ1,
        reflectionQ2: d.reflectionQ2,
      }))
    );

    console.log(`   ✓ "${plan.title}" (${plan.days.length} days)`);
  }
  console.log("✅ Seed complete.");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
