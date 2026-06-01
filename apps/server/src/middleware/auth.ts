import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};

/**
 * Requires a valid Better Auth session. Populates c.var.user, else 401.
 * This is the layer that replaces Supabase row-level security: every data
 * route reads the authenticated user id from here and scopes queries to it.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  await next();
});
