import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Clear the device-local state of a PERSONAL plan run — saved drafts and the
 * until-midnight day lock. Used when restarting a plan so the fresh run starts
 * blank instead of resurrecting old drafts. Group-run keys (which carry a
 * group segment) are untouched.
 */
export async function purgePersonalPlanLocalState(planId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter(
      (k) =>
        k.startsWith(`@ironsharp/draft_${planId}_day_`) ||
        k === `@ironsharp/devotional_locked_until_${planId}`
    );
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {
    /* best effort — worst case an old draft prefills */
  }
}
