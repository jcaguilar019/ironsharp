import { useState } from "react";
import { ActivityIndicator, Alert, LayoutAnimation, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Clock, Trash2 } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { useThemeColor } from "@/components/useThemeColor";
import { useArchivedGroups } from "@/lib/queries";
import { ApiClient, ApiError, type ArchivedGroup } from "@/lib/api";

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
  const qc = useQueryClient();
  const toast = useToast();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const destructive = useThemeColor("destructive");
  const q = useArchivedGroups();

  const groups = q.data ?? [];

  // Collapsed by default so the screen reads as a short list of group names;
  // tap a name to reveal that group's plans. Multiple can be open at once.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ArchivedGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ApiClient.deleteArchivedGroup(deleteTarget.id);
      await qc.invalidateQueries({ queryKey: ["groups", "archived"] });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      toast.show("Group deleted");
      setDeleteTarget(null);
    } catch (err) {
      Alert.alert("Couldn't delete", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setDeleting(false);
    }
  };

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
              When a group you were in is ended, it and its history will show up here.
            </Text>
          </View>
        ) : (
          groups.map((g) => {
            const isOpen = expandedIds.has(g.id);
            return (
              <View key={g.id} className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
                {/* Collapsed header — tap the group name to expand */}
                <Pressable
                  onPress={() => toggle(g.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${g.name}`}
                  accessibilityState={{ expanded: isOpen }}
                  className="flex-row items-center gap-3 p-4"
                >
                  <View className="flex-1">
                    <Text className="font-serif text-lg font-bold text-foreground">{g.name}</Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      Ended by {g.archivedByName}
                      {g.archivedAt ? ` · ${formatDate(g.archivedAt)}` : ""}
                    </Text>
                  </View>
                  {isOpen ? (
                    <ChevronUp size={20} color={muted} />
                  ) : (
                    <ChevronDown size={20} color={muted} />
                  )}
                </Pressable>

                {/* Expanded body — plans + permanent delete */}
                {isOpen && (
                  <View style={{ borderTopWidth: 1, borderTopColor: border }} className="gap-2 p-4">
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
                          className="flex-row items-center gap-3 rounded-xl border border-border bg-background p-4"
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
                                : "In progress when ended"}
                            </Text>
                          </View>
                          {p.planId ? <ChevronRight size={18} color={muted} /> : null}
                        </Pressable>
                      ))
                    )}

                    {/* Permanent, per-user removal of this past group */}
                    <Pressable
                      onPress={() => setDeleteTarget(g)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${g.name} permanently`}
                      className="mt-1 flex-row items-center justify-center gap-1.5 py-3"
                    >
                      <Trash2 size={14} color={destructive} />
                      <Text style={{ color: destructive, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                        Delete permanently
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete permanently"
        message={
          deleteTarget
            ? `This removes “${deleteTarget.name}” from your Past groups and permanently deletes your reflections for it. This can't be undone.`
            : ""
        }
        confirmLabel="Delete permanently"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </Screen>
  );
}
