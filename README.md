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
| **Auth**     | **Neon Auth** (managed Better Auth) — email/password + social   |
| **Database** | **Neon** Postgres via Drizzle ORM                              |

```
📱 Expo app
   ├─ auth →  Neon Auth URL  (managed Better Auth; writes the neon_auth schema)
   └─ data →  🚂 Hono API on Railway  (Authorization: Bearer <Neon JWT>)
                 └─ verifies the JWT via Neon's JWKS, scopes queries to the user
                                        ⮑ everything lives in one 🐘 Neon database
```

Auth is handled by **Neon Auth** — a managed Better Auth service tied to the
database; the app signs in directly against its Auth URL and there's no auth
server or secret to run. The app never touches the database directly: the Hono
API holds the Neon credentials, verifies the Neon-issued JWT on each request,
and scopes every query to that user (replacing the Supabase prototype's RLS).

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
cp .env.example .env          # then fill in DATABASE_URL + NEON_AUTH_URL
npm install
npm run db:push               # create the app's tables in Neon
npm run db:seed               # load the 3 starter devotional plans (21 days)
npm run dev                   # http://localhost:8787
```

- `DATABASE_URL` — your Neon connection string (use the **pooled** one).
- `NEON_AUTH_URL` — your Neon Auth URL (enable Auth in the Neon Console). The
  server uses it to verify tokens; there's no auth secret to manage.

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

See **[DEPLOY.md](./DEPLOY.md)** for the full walkthrough. In short:

- **Neon:** create a project, enable **Auth**. Grab the pooled `DATABASE_URL`
  and the **Auth URL**.
- **API (Railway):** new service from this repo, root directory `apps/server`.
  Set `DATABASE_URL` + `NEON_AUTH_URL`. Run `db:push` + `db:seed` once.
- **Mobile:** set `EXPO_PUBLIC_API_URL` (Railway) and `EXPO_PUBLIC_NEON_AUTH_URL`
  (Neon Auth), then build with EAS.

## What's in this foundation

This is the first milestone of the rewrite — the infrastructure plus the core
daily flow, all themed identically to the original (5 palettes, Playfair Display
+ DM Sans):

- ✅ Auth: sign up / log in / sign out via Neon Auth + auto-created profiles
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
