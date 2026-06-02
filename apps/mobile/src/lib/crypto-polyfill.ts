import "react-native-get-random-values";
import * as ExpoCrypto from "expo-crypto";

const g = globalThis as any;

// @neondatabase/auth calls crypto.randomUUID() at module-load time.
if (!g.crypto) g.crypto = {};
if (!g.crypto.randomUUID) g.crypto.randomUUID = () => ExpoCrypto.randomUUID();

// @neondatabase/auth (via Better Auth) constructs JSON responses with the
// static `Response.json(data, init)` shorthand, which React Native's fetch
// implementation does not ship. Polyfill it so getJWTToken / getSession work.
if (typeof Response !== "undefined" && typeof (Response as any).json !== "function") {
  (Response as any).json = (data: unknown, init?: ResponseInit) => {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify(data), { ...init, headers });
  };
}
