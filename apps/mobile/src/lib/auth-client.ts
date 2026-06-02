import "./crypto-polyfill";
import { createInternalNeonAuth } from "@neondatabase/auth";

const url = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
if (!url) {
  console.warn(
    "[auth] EXPO_PUBLIC_NEON_AUTH_URL is not set. Copy apps/mobile/.env.example " +
      "to .env and paste your Neon Auth URL."
  );
}

// Neon Auth is a managed Better Auth server. This wrapper exposes both the
// Better Auth client (sign in/up/out, sessions) and a helper to mint the JWT we
// forward to our own Railway API.
const origin = url ? new URL(url).origin : "";

const neon = createInternalNeonAuth(url ?? "", {
  fetchOptions: {
    headers: { Origin: origin },
  },
});

/** Better Auth client: authClient.signIn.email / signUp.email / getSession / signOut / signIn.social */
export const authClient = neon.adapter;

/**
 * The JWT to send to the IronSharp API as `Authorization: Bearer …`.
 * The server verifies it against Neon Auth's JWKS.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await neon.getJWTToken();
  } catch {
    return null;
  }
}
