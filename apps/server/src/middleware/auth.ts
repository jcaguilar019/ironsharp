import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
};

export type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};

const NEON_AUTH_URL = process.env.NEON_AUTH_URL;
if (!NEON_AUTH_URL) {
  console.warn(
    "[auth] NEON_AUTH_URL is not set — JWT verification will fail. " +
      "Set it to your Neon Auth URL (see .env.example)."
  );
}

const JWKS_URL = NEON_AUTH_URL
  ? `${NEON_AUTH_URL.replace(/\/$/, "")}/.well-known/jwks.json`
  : "";

const JWKS = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

// Cache verified tokens for 60 seconds to avoid re-verifying on every request.
type CachedEntry = { user: AuthUser; expiresAt: number };
const tokenCache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 60_000;

async function verifyToken(token: string): Promise<AuthUser | null> {
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  if (!JWKS) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS);
    if (!payload.sub) return null;

    const user: AuthUser = {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };

    tokenCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });

    if (tokenCache.size > 1_000) {
      const now = Date.now();
      for (const [k, v] of tokenCache) {
        if (v.expiresAt <= now) tokenCache.delete(k);
      }
    }

    return user;
  } catch (err) {
    console.log("[auth] jwtVerify failed:", err);
    return null;
  }
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!JWKS) return c.json({ error: "Auth is not configured" }, 500);

  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  console.log("[auth] token present:", !!token, token ? token.slice(0, 20) + "…" : "MISSING");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const user = await verifyToken(token);
  console.log("[auth] verifyToken:", user ? `ok uid=${user.id}` : "null");
  if (!user) return c.json({ error: "Invalid or expired token" }, 401);

  c.set("user", user);
  await next();
});
