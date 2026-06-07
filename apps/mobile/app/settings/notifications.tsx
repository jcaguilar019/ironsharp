import { useEffect, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { useProfile } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import {
  scheduleMorningReminder,
  cancelMorningReminder,
  scheduleDailyNudge,
  cancelDailyNudge,
} from "@/lib/notifications";

type Prefs = {
  notifMorningReminder: boolean;
  notifPartnerDone: boolean;
  notifDailyNudge: boolean;
  notifGroupComplete: boolean;
};

const ROWS: Array<{ key: keyof Prefs; label: string; hint: string }> = [
  {
    key: "notifMorningReminder",
    label: "Morning reminder",
    hint: "A gentle nudge to do your devotional first thing.",
  },
  {
    key: "notifPartnerDone",
    label: "Partner finished",
    hint: "Get notified when your accountability partner completes their day.",
  },
  {
    key: "notifDailyNudge",
    label: "Daily nudge",
    hint: "An afternoon nudge if you haven't finished yet.",
  },
  {
    key: "notifGroupComplete",
    label: "Group complete",
    hint: "Pinged when everyone in your group has submitted.",
  },
];

export default function NotificationSettings() {
  const profile = useProfile();
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  useEffect(() => {
    if (profile.data && prefs === null) {
      setPrefs({
        notifMorningReminder: profile.data.notifMorningReminder,
        notifPartnerDone: profile.data.notifPartnerDone,
        notifDailyNudge: profile.data.notifDailyNudge,
        notifGroupComplete: profile.data.notifGroupComplete,
      });
    }
  }, [profile.data]);

  const toggle = (key: keyof Prefs) => (value: boolean) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));

    ApiClient.saveNotifPrefs({ [key]: value })
      .then(() => qc.invalidateQueries({ queryKey: ["profile"] }))
      .catch(() => {
        // revert on failure
        setPrefs((p) => (p ? { ...p, [key]: !value } : p));
      });

    if (key === "notifMorningReminder") {
      if (value) scheduleMorningReminder();
      else cancelMorningReminder();
    } else if (key === "notifDailyNudge") {
      if (value) scheduleDailyNudge();
      else cancelDailyNudge();
    }
  };

  const loaded = prefs !== null;
  const current: Prefs = prefs ?? {
    notifMorningReminder: true,
    notifPartnerDone: true,
    notifDailyNudge: true,
    notifGroupComplete: true,
  };

  return (
    <Screen edges={["top"]}>
      <Header title="Notifications" subtitle="What we ping you about" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden rounded-xl border border-border bg-card">
          {ROWS.map((row, i) => (
            <View
              key={row.key}
              className={`flex-row items-center gap-3 p-4 ${
                i < ROWS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <View className="flex-1">
                <Text className="font-sans-medium text-base text-foreground">
                  {row.label}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {row.hint}
                </Text>
              </View>
              <Switch
                value={current[row.key]}
                onValueChange={toggle(row.key)}
                disabled={!loaded}
                trackColor={{ true: primary, false: "#9994" }}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
