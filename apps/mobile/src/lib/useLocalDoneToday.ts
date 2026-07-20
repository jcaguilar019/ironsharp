import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Mirrors the reader's per-plan-per-DAY "locked until tomorrow" flag — which is
 * written in the device's LOCAL time on submit — so Home / Devotionals can show
 * "Done today" the instant you finish, in lockstep with what the reader shows
 * when you tap in. This sidesteps the server's UTC day boundary entirely (the
 * source of the "still says Continue even though I did it" bug) and needs no
 * round-trip. Re-reads on focus so it clears after local midnight.
 *
 * Pair it with the server's `doneToday` (OR them): the server covers fresh
 * installs / other devices; this covers the local-evening gap.
 *
 * `day` is required to find the lock: the key is scoped per day so that catching
 * up on a missed day can't mark the CURRENT day done. Pass the live day.
 */
export function useLocalDoneToday(planId?: string, groupId?: string, day?: number): boolean {
  const [done, setDone] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!planId || !day) {
        setDone(false);
        return;
      }
      const key = groupId
        ? `@ironsharp/devotional_locked_until_${planId}_${groupId}_day_${day}`
        : `@ironsharp/devotional_locked_until_${planId}_day_${day}`;
      import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
        AsyncStorage.getItem(key).then((val) => {
          if (active) setDone(!!(val && Date.now() < Number(val)));
        });
      });
      return () => {
        active = false;
      };
    }, [planId, groupId, day])
  );

  return done;
}
