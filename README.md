# IronSharp

> _"As iron sharpens iron, so one person sharpens another." — Proverbs 27:17_

A discipleship devotional app. Men (and groups) read a daily passage, reflect on
two questions, pray, and sharpen each other day by day.

This is a ground-up rewrite of the original Lovable/Supabase web prototype into a
proper mobile app with its own backend.

## Stack

| Layer        | Tech                                                            |
| ------------ | -------------------------------------------------------------- |
| **Mobile**   | React Native · Expo (Router) · TypeScript · NativeWind         |
| **API**      | Hono · TypeScript — deploys to **Railway**                     |
| **Auth**     | Better Auth (email/password + optional Google/Apple)           |
| **Database** | **Neon** Postgres via Drizzle ORM                              |

```
📱 Expo app  ──HTTPS──▶  🚂 Hono API (Railway)  ──▶  🐘 Neon Postgres
   apps/mobile             apps/server
```

The app never talks to the database directly. The API server holds the Neon
credentials, runs Better Auth, and scopes every query to the logged-in user
(this replaces the row-level-security the Supabase prototype relied on).

## Repo layout

```
ironsharp/
├── apps/
│   ├── server/   # Hono API, Better Auth, Drizzle schema + seed
│   └── mobile/   # Expo app (Expo Router), themed UI, API client
└── package.json  # npm workspaces
```

## Getting started

### 1. Backend (`apps/server`)

```bash
cd apps/server
cp .env.example .env          # then fill in DATABASE_URL + BETTER_AUTH_SECRET
npm install
npm run db:push               # create tables in Neon
npm run db:seed               # load the 3 starter devotional plans (21 days)
npm run dev                   # http://localhost:8787
```

- `DATABASE_URL` — your Neon connection string (use the **pooled** one).
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`.
- Google/Apple sign-in stay hidden until you add their keys to `.env`.

### 2. Mobile (`apps/mobile`)

```bash
cd apps/mobile
cp .env.example .env          # set EXPO_PUBLIC_API_URL to your machine's LAN IP
npm install
npm start                     # open in Expo Go / a simulator
```

> ⚠️ Use your computer's **LAN IP** (e.g. `http://192.168.1.50:8787`), not
> `localhost` — the phone/simulator can't reach your laptop via localhost.

## Deploying

- **Database (Neon):** create a project, copy the pooled connection string into
  the server's `DATABASE_URL`. Run `npm run db:push` once to provision tables.
- **API (Railway):** new service from this repo, root directory `apps/server`,
  build `npm install && npm run build`, start `npm run start`. Set the same env
  vars; point `BETTER_AUTH_URL` at the Railway URL.
- **Mobile:** set `EXPO_PUBLIC_API_URL` to the Railway URL and build with EAS.

## What's in this foundation

This is the first milestone of the rewrite — the infrastructure plus the core
daily flow, all themed identically to the original (5 palettes, Playfair Display
+ DM Sans):

- ✅ Auth: sign up / log in / sign out (Better Auth) + auto-created profiles
- ✅ Onboarding: profile → role → starter plan → welcome
- ✅ Home, Devotional hub, daily **reading + reflection + prayer** with progress
- ✅ Plans browser by category, start/continue/complete, completed list
- ✅ Profile + full theme picker (all 5 themes persist)
- ✅ Full database schema ported (groups, submissions, reactions, discipler
  notes, memberships) ready for the next milestones

### Next milestones (not in this round)

Groups & invites, community feed, discipler notes/threads, family & youth modes,
study notes, voice memos / read-aloud, memberships & paywall, email verification
and password reset (needs an email provider).
```
