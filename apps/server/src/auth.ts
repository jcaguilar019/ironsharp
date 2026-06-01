import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "./db/index.js";
import { schema, profiles } from "./db/schema.js";

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const hasApple = !!process.env.APPLE_CLIENT_ID && !!process.env.APPLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
    // Email verification is off until an email provider is wired up.
    // Flip to true once you configure sendVerificationEmail.
    requireEmailVerification: false,
  },

  socialProviders: {
    ...(hasGoogle
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {}),
    ...(hasApple
      ? {
          apple: {
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
          },
        }
      : {}),
  },

  // Replaces the old Postgres `handle_new_user` trigger: every new user gets a
  // profile row with a sensible default display name.
  databaseHooks: {
    user: {
      create: {
        after: async (newUser) => {
          const displayName =
            newUser.name?.trim() || newUser.email.split("@")[0] || "Friend";
          await db
            .insert(profiles)
            .values({
              userId: newUser.id,
              displayName,
              avatarUrl: newUser.image ?? null,
              primaryRole: "disciple",
            })
            .onConflictDoNothing();
        },
      },
    },
  },

  plugins: [expo()],
});

export type Auth = typeof auth;
