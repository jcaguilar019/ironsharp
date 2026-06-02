import "./crypto-polyfill";
import { createInternalNeonAuth } from "@neondatabase/auth";
import * as SecureStore from "expo-secure-store";

const url = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
if (!url) {
  console.warn(
    "[auth] EXPO_PUBLIC_NEON_AUTH_URL is not set. Copy apps/mobile/.env.example " +
      "to .env and paste your Neon Auth URL."
  );
}

const origin = url ? new URL(url).origin : "";
const TOKEN_KEY = "ironsharp_session_token";

// In-memory copy so onRequest (synchronous) can access it without async.
let _sessionToken: string | null = null;

// Warm the in-memory token from SecureStore on module load (app restart case).
SecureStore.getItemAsync(TOKEN_KEY)
  .then((t) => { if (t) _sessionToken = t; })
  .catch(() => {});

const neon = createInternalNeonAuth(url ?? "", {
  fetchOptions: {
    headers: { Origin: origin },

    // REACT NATIVE: no cookie jar, so inject the stored session token as a
    // Bearer credential on every request to the Neon Auth server. This is the
    // same thing Better Auth's reactNativePlugin does internally.
    onRequest: (ctx: any) => {
      if (_sessionToken) {
        try {
          ctx.headers?.set("Authorization", `Bearer ${_sessionToken}`);
        } catch {}
      }
    },

    // After every successful auth response, capture and persist the session
    // token so it survives the 60-second in-memory cache expiry.
    onSuccess: async (ctx: any) => {
      const token: string | undefined = ctx.data?.session?.token;
      if (token) {
        _sessionToken = token;
        SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
      }
    },
  },
});

/** Better Auth client: authClient.signIn.email / signUp.email / getSession / signOut / signIn.social */
export const authClient = neon.adapter;

export async function clearAuthToken() {
  _sessionToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

/**
 * Returns the bearer token for IronSharp API requests.
 *
 * Because React Native has no cookie jar, @neondatabase/auth can't maintain a
 * session via cookies. Instead we:
 *  1. Store the session token in-memory + SecureStore after every auth event.
 *  2. Inject it as `Authorization: Bearer` on every Neon Auth request (onRequest
 *     above), so getSession() succeeds even after the 60s in-memory cache expires.
 *  3. Use the same token here as the credential for our own API. The server
 *     verifies it by calling Neon Auth's /api/auth/get-session endpoint.
 */
export async function getAuthToken(): Promise<string | null> {
  // Try to get a fresh token via getSession (works while cache is warm OR once
  // the Bearer injection above lets Neon Auth authenticate the cold request).
  try {
    const session = await authClient.getSession();
    const token: string | null = (session?.data as any)?.session?.token ?? null;
    if (token) {
      _sessionToken = token;
      SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
      return token;
    }
  } catch {}

  // Fallback: whatever we last stored (covers the window before getSession resolves).
  if (_sessionToken) return _sessionToken;

  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    if (stored) _sessionToken = stored;
    return stored;
  } catch {
    return null;
  }
}
