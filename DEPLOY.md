# Deploying IronSharp (Neon + Railway)

This walks through standing up the database (Neon) and the API server (Railway),
then pointing the mobile app at it. ~15 minutes.

> 🔒 **Secrets:** never paste `DATABASE_URL` into chat, commits, or screenshots.
> It lives only in Railway variables / a local `.env` file (both git-ignored).
> The Neon Auth URL isn't secret, but keep it in env too for tidiness.

---

## 1. Neon — database + auth

1. Go to <https://console.neon.tech> → **New Project**.
   - Name: `ironsharp`. Pick a region close to where Railway runs (e.g. US East).
2. **Connection Details** → copy the **pooled** connection string (host contains
   `-pooler`). This is your `DATABASE_URL`:
   ```
   postgresql://user:password@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. In the project, open **Auth** → **Enable Neon Auth**. This provisions managed
   authentication (Better Auth) that stores users in a `neon_auth` schema in this
   same database — no auth server or secret to manage.
4. Copy your **Auth URL** (looks like
   `https://ep-xxxx.neonauth.us-east-2.aws.neon.tech/neondb/auth`). You'll use it
   in two places: the server's `NEON_AUTH_URL` (to verify tokens) and the app's
   `EXPO_PUBLIC_NEON_AUTH_URL` (to sign users in).
   - While you're here, enable **Email/Password** (and any social providers you
     want) under the Auth settings.

Tables for the app's own data get created in step 3.

---

## 2. Railway — the API server

1. Go to <https://railway.app> → **New Project** → **Deploy from GitHub repo** →
   pick `Josiah-Turnquist/ironsharp`.
2. Open the service → **Settings**:
   - **Root Directory:** `apps/server`
     (this is the monorepo bit — Railway then builds only the server.)
   - Build/start are already defined in `apps/server/railway.json`, so leave
     "Custom Build/Start Command" empty.
3. Open **Variables** and add just these two:

   | Variable        | Value                                                |
   | --------------- | ---------------------------------------------------- |
   | `DATABASE_URL`  | the pooled Neon string from step 1                   |
   | `NEON_AUTH_URL` | your Neon Auth URL from step 1                        |

   `PORT` is injected by Railway automatically — don't set it. There's **no auth
   secret** — Neon Auth is managed, and the server only *verifies* its tokens via
   the public JWKS. `DATABASE_URL` is the only real secret.
4. Let it deploy, then **Settings → Networking → Generate Domain**. You'll get a
   URL like `https://ironsharp-production.up.railway.app`.
   - Visit `https://<that-domain>/health` — you should see `{"ok":true}`.

---

## 3. Create tables + load devotional content

Use the Railway CLI so these commands run with the deployed `DATABASE_URL`
(no copying secrets around):

```bash
npm i -g @railway/cli
railway login
railway link              # pick the ironsharp project + server service
railway run npm run db:push   # creates all tables in Neon
railway run npm run db:seed   # loads the 3 starter plans (21 days)
```

> Prefer to run locally instead? Put `DATABASE_URL` in `apps/server/.env` and run
> the same two npm scripts from `apps/server`.

---

## 4. Point the app at the server

In `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL="https://<your-railway-domain>"
EXPO_PUBLIC_NEON_AUTH_URL="https://<your-neon-auth-url>/neondb/auth"
```

Restart Expo (`npm start`) so it picks up the new values. Sign up — the app
authenticates directly against Neon Auth, then calls the Railway API with the
Neon-issued token, and your profile is created on first request.

> For purely local development you can instead run `apps/server` on your machine
> (`npm run dev`) and set `EXPO_PUBLIC_API_URL` to `http://<your-LAN-IP>:8787`.

---

## 5. (Optional) Google / Apple sign-in

Social sign-in is configured in the **Neon Console → Auth** (not on the Railway
server) — add the provider and its keys there, and the app's Google/Apple
buttons start working. No server redeploy needed.

---

## 6. Build for your phone (EAS)

A standalone test build via EAS. Run these from `apps/mobile` on a machine logged
into your Expo account (`eas-cli` can't run in this sandbox — no Expo login and
the network is locked down here).

```bash
cd apps/mobile
npm i -g eas-cli
eas login
eas init            # links/creates the Expo project (writes extra.eas.projectId)

# Android — easiest: produces an installable APK you can sideload
eas build -p android --profile preview

# iOS — needs an Apple Developer account; registers your device (ad-hoc)
eas build -p ios --profile preview
```

When it finishes, EAS gives you a QR code / install link. Android installs the
APK directly; iOS installs once your device UDID is registered.

**Before building:** edit `eas.json` and replace `REPLACE_WITH_YOUR_NEON_AUTH_URL`
in each profile with your real Neon Auth URL. `EXPO_PUBLIC_*` vars are baked in at
build time, so the build must have them. (`EXPO_PUBLIC_API_URL` is already set to
the Railway URL.)

> **Faster alternative for quick checks:** `npx expo start` and scan the QR with
> the **Expo Go** app. Email/password sign-in works there; the only things Expo
> Go can't exercise are the `ironsharp://` deep link and native social-login
> redirects (those need the EAS build above).

> **Monorepo note:** EAS uploads the whole repo and Metro is configured for
> workspaces, so building from `apps/mobile` works. If a build's install step
> fails, see Expo's "monorepo" guide — usually a one-line tweak.
