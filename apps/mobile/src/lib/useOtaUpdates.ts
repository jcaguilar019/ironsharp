import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

const RECHECK_MS = 60_000; // don't hammer the update server on rapid foregrounds
const APPLY_AFTER_AWAY_MS = 20_000; // only auto-reload on a "real" return

/**
 * Keeps the app on the latest OTA bundle without the cold-relaunch dance.
 *
 * On launch and on each foreground we check for an update and pre-download it.
 * When one is ready AND the user returns after being away a while, we apply it
 * (a fresh foreground is a natural reload point — we skip it on a quick
 * app-switch so we never yank the screen out from under active use).
 *
 * Everything is wrapped so update logic can never throw into the app. This is
 * deliberately the ONLY moving part of update delivery — no native config
 * needed, ships over OTA itself.
 */
export function useOtaUpdates() {
  const pending = useRef(false); // an update has been downloaded and is ready
  const busy = useRef(false);
  const lastCheck = useRef(0);
  const awaySince = useRef<number | null>(null);

  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return;
    let cancelled = false;

    const check = async () => {
      if (busy.current || pending.current) return;
      if (Date.now() - lastCheck.current < RECHECK_MS) return;
      busy.current = true;
      lastCheck.current = Date.now();
      try {
        const res = await Updates.checkForUpdateAsync();
        if (!cancelled && res.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (!cancelled) pending.current = true;
        }
      } catch {
        // offline, no update, transient server error — never surface.
      } finally {
        busy.current = false;
      }
    };

    check(); // cold launch

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const awayMs = awaySince.current ? Date.now() - awaySince.current : 0;
        awaySince.current = null;
        if (pending.current && awayMs > APPLY_AFTER_AWAY_MS) {
          Updates.reloadAsync().catch(() => {});
        } else {
          check();
        }
      } else if (awaySince.current == null) {
        awaySince.current = Date.now();
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
}
