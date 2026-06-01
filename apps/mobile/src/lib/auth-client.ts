import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

const baseURL = process.env.EXPO_PUBLIC_API_URL;
if (!baseURL) {
  // Surfaces a clear error instead of a confusing network failure.
  console.warn(
    "[auth] EXPO_PUBLIC_API_URL is not set. Copy apps/mobile/.env.example to .env."
  );
}

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    expoClient({
      scheme: "ironsharp",
      storagePrefix: "ironsharp",
      storage: SecureStore,
    }),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;
