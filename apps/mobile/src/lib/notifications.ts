// ── NOTIFICATIONS STUB ─────────────────────────────────────────────────────
// expo-notifications was removed from this build (TurboModule init was the
// most likely cause of the production launch crash). The notifications screen
// and a few other files still import these functions — keep their shape so
// nothing else has to change. Re-add the package + restore the real impl
// after the launch crash is sorted.

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

// `(tabs)/_layout.tsx` calls this from a useEffect. Without an export
// here, the destructured import resolves to `undefined`, and the call
// throws `TypeError: registerAndSaveToken is not a function` — which under
// React 19 + new arch + bridgeless can propagate into the TurboModule
// queue's exception handler and terminate the process.
export async function registerAndSaveToken(): Promise<void> {}

export async function scheduleMorningReminder(): Promise<void> {}
export async function cancelMorningReminder(): Promise<void> {}
export async function scheduleDailyNudge(): Promise<void> {}
export async function cancelDailyNudge(): Promise<void> {}
