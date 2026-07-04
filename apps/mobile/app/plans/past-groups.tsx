import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Archive, CheckCircle2, ChevronRight, Clock } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { useArchivedGroups } from "@/lib/queries";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PastGroups() {
  const router = useRouter();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const q = useArchivedGroups();

  const groups = q.data ?? [];

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Past groups" subtitle="Archived" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-4 pb-12 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {q.isLoading ? (
          <ActivityIndicator color={primary} style={{ marginTop: 24 }} />
        ) : groups.length === 0 ? (
          <View className="items-center rounded-xl border border-border bg-card p-8">
            <Archive size={26} color={primary} />
            <Text className="mt-3 font-serif text-xl font-semibold text-foreground">
              No past groups
            </Text>
            <Text className="mt-1 text-center text-sm text-muted-foreground">
              When a group you were in is deleted, it and its history will show up here.
            </Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.id} className="mb-6">
              <Text className="font-serif text-lg font-bold text-foreground">{g.name}</Text>
              <Text className="mb-2 text-xs text-muted-foreground">
                Deleted by {g.archivedByName}
                {g.archivedAt ? ` · ${formatDate(g.archivedAt)}` : ""}
              </Text>

              {g.plans.length === 0 ? (
                <Text className="text-sm italic text-muted-foreground">
                  No plans were started in this group.
                </Text>
              ) : (
                g.plans.map((p) => (
                  <Pressable
                    key={p.planId ?? p.title}
                    disabled={!p.planId}
                    onPress={() =>
                      p.planId &&
                      router.push({
                        pathname: "/plans/past-responses",
                        params: { groupId: g.id, planId: p.planId, title: p.title },
                      })
                    }
                    className="mb-2 flex-row items-center gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    {p.status === "completed" ? (
                      <CheckCircle2 size={20} color={primary} />
                    ) : (
                      <Clock size={20} color={muted} />
                    )}
                    <View className="flex-1">
                      <Text className="font-serif text-base font-bold text-foreground">
                        {p.title}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {p.status === "completed"
                          ? `Completed${p.completedAt ? ` ${formatDate(p.completedAt)}` : ""}`
                          : "In progress when deleted"}
                      </Text>
                    </View>
                    {p.planId ? <ChevronRight size={18} color={muted} /> : null}
                  </Pressable>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
