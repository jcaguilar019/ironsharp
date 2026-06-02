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

// Neon Auth publishes its public keys here; jose caches and refreshes them.
const jwks = NEON_AUTH_URL
  ? createRemoteJWKSet(new URL(`${NEON_AUTH_URL.replace(/\/$/, "")}/.well-known/jwks.json`))
  : null;

/**
 * Requires a valid Neon Auth JWT (sent as `Authorization: Bearer <token>`).
 * Verifies the signature against Neon's JWKS and exposes the user on c.var.user.
 * This is the layer that replaces Supabase row-level security: every data route
 * reads the authenticated user id (the JWT `sub`) from here and scopes queries.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!jwks) return c.json({ error: "Auth is not configured" }, 500);

  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { payload } = await jwtVerify(token, jwks);
    if (!payload.sub) return c.json({ error: "Unauthorized" }, 401);
    c.set("user", {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    });
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  await next();
});
