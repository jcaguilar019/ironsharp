import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Eye,
  Flag,
  GripVertical,
  HeartHandshake,
  Link,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { useGroups, useActiveDevotional, useDiscipleships, useProfile } from "@/lib/queries";
import { useLocalDoneToday } from "@/lib/useLocalDoneToday";
import { PopIn } from "@/components/PopIn";
import {
  ApiClient,
  ApiError,
  type Group,
  type UserSearchResult,
  type DiscipleshipRelationship,
} from "@/lib/api";

const GROUP_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  "one-on-one":  { label: "One-on-One",  color: "#89B4C9" },
  "family":      { label: "Family",      color: "#7FAF8A" },
  "small-group": { label: "Small Group", color: "#C49A78" },
  "large-group": { label: "Large Group", color: "#9B8EC4" },
  "community":   { label: "Church",      color: "#7A9EAF" },
};

const GROUP_TYPE_KEYS = Object.keys(GROUP_TYPE_CONFIG);

// ─── Section helpers (ported from the former Devotionals tab) ─────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
      {label}
    </Text>
  );
}

function EmptyNote({ text }: { text: string }) {
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  return (
    <View style={{ borderLeftWidth: 2, borderLeftColor: border, paddingLeft: 12, marginBottom: 2 }}>
      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: muted, fontStyle: "italic" }}>
        {text}
      </Text>
    </View>
  );
}

function Divider() {
  const border = useThemeColor("border");
  return <View style={{ height: 1, backgroundColor: border, marginVertical: 24 }} />;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function InviteCodeRow({
  inviteCode,
  accent,
  muted,
  border,
  card,
}: {
  inviteCode: string;
  accent: string;
  muted: string;
  border: string;
  card: string;
}) {
  const shareCode = () =>
    Share.share({
      message: `Join my IronSharp group — enter code ${inviteCode} in the app.`,
    });

  return (
    <View>
      <Text
        style={{
          fontFamily: "DMSans_700Bold",
          fontSize: 11,
          color: muted,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Invite Code
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: card,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 10,
        }}
      >
        <Text
          selectable
          style={{
            flex: 1,
            fontFamily: "DMSans_700Bold",
            fontSize: 22,
            letterSpacing: 4,
            color: accent,
          }}
        >
          {inviteCode}
        </Text>
        <Pressable
          onPress={shareCode}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Share invite code"
        >
          <Link size={18} color={muted} />
        </Pressable>
      </View>
      <Text
        style={{
          fontFamily: "DMSans_400Regular",
          fontSize: 12,
          color: muted,
          marginTop: 6,
        }}
      >
        Share this code or tap the link icon to send it.
      </Text>
    </View>
  );
}

function MemberSearch({
  groupId,
  existingUserIds,
  accent,
  muted,
  border,
  card,
  bg,
  fg,
  onAdded,
}: {
  groupId: string;
  existingUserIds: Set<string>;
  accent: string;
  muted: string;
  border: string;
  card: string;
  bg: string;
  fg: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { users } = await ApiClient.searchUsers(query);
        setResults(users.filter((u) => !existingUserIds.has(u.userId)));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, existingUserIds]);

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    try {
      await ApiClient.addGroupMember(groupId, userId);
      setResults((prev) => prev.filter((u) => u.userId !== userId));
      onAdded();
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "Could not add member.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <View>
      <Text
        style={{
          fontFamily: "DMSans_700Bold",
          fontSize: 11,
          color: muted,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Add People
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name…"
        placeholderTextColor={muted}
        style={{
          borderWidth: 1,
          borderColor: border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: fg,
          backgroundColor: bg,
          fontSize: 14,
          fontFamily: "DMSans_400Regular",
          marginBottom: 8,
        }}
      />
      {searching && <ActivityIndicator size="small" color={accent} style={{ marginBottom: 8 }} />}
      {results.map((user) => (
        <View
          key={user.userId}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: card,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 10,
            padding: 12,
            marginBottom: 6,
            gap: 10,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: accent + "22",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: accent }}>
              {user.displayName[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={{ flex: 1, fontFamily: "DMSans_400Regular", fontSize: 14, color: fg }}>
            {user.displayName}
          </Text>
          <Pressable
            onPress={() => handleAdd(user.userId)}
            disabled={adding === user.userId}
            style={{ opacity: adding === user.userId ? 0.5 : 1 }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${user.displayName} to group`}
          >
            {adding === user.userId ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <UserPlus size={18} color={accent} />
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// Bottom-sheet modal shared by the create / edit / join flows. Lifts above the
// keyboard (so inputs aren't hidden), and tapping the dimmed backdrop closes it
// while taps inside the sheet are absorbed by the inner Pressable.
function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const bg = useThemeColor("background");
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={onClose}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: bg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 40,
              maxHeight: "90%",
            }}
          >
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Discipleship (one-on-one) ────────────────────────────────────────────────

// One-time privacy notice the disciple must accept before the relationship goes
// active and the discipler can see their responses.
function PrivacyNoticeModal({
  visible,
  disciplerName,
  busy,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  disciplerName: string;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const bg = useThemeColor("background");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const primary = useThemeColor("primary");
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDecline}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: fg, marginBottom: 12 }}>
            A discipleship invite
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: fg, lineHeight: 22, marginBottom: 12 }}>
            {disciplerName} would like to walk with you as your discipler.
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, lineHeight: 21, marginBottom: 24 }}>
            If you accept, they'll be able to see your devotional responses for this
            group as you submit them — except any field you mark private, which stays
            private. They may also send you a daily question and write to you in a
            private mailbox. You can decline now, and either of you can end this later.
          </Text>
          <Pressable
            onPress={onAccept}
            disabled={busy}
            style={{ opacity: busy ? 0.5 : 1, backgroundColor: primary, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 }}
          >
            <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 }}>
              {busy ? "Accepting…" : "Accept"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            disabled={busy}
            style={{ height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 14 }}>Decline</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DiscipleChip({
  icon: Icon,
  label,
  color,
  badge,
  onPress,
}: {
  icon: typeof Eye;
  label: string;
  color: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: color, borderRadius: 8, backgroundColor: color + "15" }}
      className="flex-row items-center gap-1.5 px-3 py-2"
    >
      <Icon size={13} color={color} />
      <Text style={{ color, fontFamily: "DMSans_500Medium", fontSize: 12 }}>{label}</Text>
      {badge && badge > 0 ? (
        <View style={{ minWidth: 16, height: 16, borderRadius: 8, backgroundColor: color, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 10 }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// Discipleship entry points rendered inside an expanded one-on-one card.
function DiscipleshipSection({
  group,
  rel,
  myUserId,
  accent,
}: {
  group: Group;
  rel: DiscipleshipRelationship | undefined;
  myUserId: string | undefined;
  accent: string;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const [showNotice, setShowNotice] = useState(false);
  const [busy, setBusy] = useState(false);

  const other = group.members.find((m) => m.userId !== myUserId);

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["discipleship"] }),
      qc.invalidateQueries({ queryKey: ["groups"] }),
    ]);

  const handleInvite = () => {
    if (!other) return;
    Alert.alert(
      "Start discipleship",
      `Invite ${other.displayName} as your disciple? They'll be asked to accept first.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send invite",
          onPress: async () => {
            setBusy(true);
            try {
              await ApiClient.inviteDisciple(group.id, other.userId);
              await refresh();
            } catch (err) {
              Alert.alert("Couldn't invite", err instanceof ApiError ? err.message : "Please try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleAccept = async () => {
    if (!rel) return;
    setBusy(true);
    try {
      await ApiClient.acceptDiscipleship(rel.id);
      await refresh();
      setShowNotice(false);
    } catch (err) {
      Alert.alert("Couldn't accept", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!rel) return;
    setBusy(true);
    try {
      await ApiClient.declineDiscipleship(rel.id);
      await refresh();
      setShowNotice(false);
    } catch (err) {
      Alert.alert("Couldn't decline", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  let body: ReactNode;
  if (!rel) {
    body = other ? (
      <DiscipleChip icon={HeartHandshake} label="Start discipleship" color={accent} onPress={handleInvite} />
    ) : (
      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, fontStyle: "italic" }}>
        Add the other person to this group to start discipleship.
      </Text>
    );
  } else if (rel.status === "pending") {
    body =
      rel.role === "disciple" ? (
        <DiscipleChip icon={HeartHandshake} label="Review discipleship invite" color={accent} onPress={() => setShowNotice(true)} />
      ) : (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, fontStyle: "italic" }}>
          Invite sent — waiting for {rel.counterpart.displayName} to accept.
        </Text>
      );
  } else if (rel.status === "active") {
    body =
      rel.role === "discipler" ? (
        <View className="flex-row flex-wrap gap-2">
          <DiscipleChip icon={Eye} label={`${rel.counterpart.displayName}'s responses`} color={accent} onPress={() => router.push(`/discipleship/${rel.id}/responses`)} />
          <DiscipleChip icon={Flag} label="Flagged" color={accent} onPress={() => router.push(`/discipleship/${rel.id}/flagged`)} />
          <DiscipleChip icon={MessageSquare} label="Mailbox" color={accent} badge={rel.unreadCount} onPress={() => router.push(`/discipleship/${rel.id}/mailbox`)} />
        </View>
      ) : (
        <DiscipleChip icon={MessageSquare} label="Mailbox" color={accent} badge={rel.unreadCount} onPress={() => router.push(`/discipleship/${rel.id}/mailbox`)} />
      );
  }

  return (
    <View className="gap-2" style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 12 }}>
      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, color: muted, letterSpacing: 1, textTransform: "uppercase" }}>
        Discipleship
      </Text>
      {body}
      <PrivacyNoticeModal
        visible={showNotice}
        disciplerName={rel?.counterpart.displayName ?? "Someone"}
        busy={busy}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const groups = useGroups();
  const active = useActiveDevotional();
  const discipleships = useDiscipleships();
  const profile = useProfile();
  const qc = useQueryClient();
  const router = useRouter();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const bg = useThemeColor("background");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Matches the reader's local "done for today" lock so the personal card agrees
  // with what you see when you tap in — even after the UTC day has rolled over.
  const localDone = useLocalDoneToday(active.data?.planId);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["progress", "active"] }),
      qc.invalidateQueries({ queryKey: ["groups"] }),
    ]);
    setRefreshing(false);
  };

  // Create flow
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("small-group");
  const [creating, setCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);

  // Edit flow
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Join by code
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const toggle = (id: string) => {
    // Animate the height change, and allow multiple groups open at once —
    // toggling one no longer auto-closes the others.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreateStep(1);
    setNewName("");
    setNewType("small-group");
    setCreatedGroup(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { group } = await ApiClient.createGroup({ name: newName.trim(), groupType: newType });
      await qc.invalidateQueries({ queryKey: ["groups"] });
      // Prefer the fully-assembled row from the list (it includes members);
      // fall back to the freshly-created group so step 2 always has the
      // invite code even if the refetch hasn't landed yet.
      const fresh = (await ApiClient.getGroups()).groups.find((g) => g.id === group.id) ?? null;
      setCreatedGroup(fresh ?? { ...group, members: group.members ?? [] });
      setCreateStep(2);
    } catch (err) {
      // Without this the failure was silent — the modal just sat on step 1
      // with no feedback, which read as "create group is broken".
      Alert.alert(
        "Couldn't create group",
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editGroup || !editName.trim()) return;
    setSaving(true);
    try {
      await ApiClient.updateGroup(editGroup.id, editName.trim());
      await qc.invalidateQueries({ queryKey: ["groups"] });
      setEditGroup(null);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const { group } = await ApiClient.joinGroupByCode(joinCode.trim());
      await qc.invalidateQueries({ queryKey: ["groups"] });
      setShowJoin(false);
      setJoinCode("");
      Alert.alert("Joined!", `You're now in ${group.name}.`);
    } catch (err) {
      Alert.alert(
        "Could not join",
        err instanceof ApiError && err.status === 404
          ? "That code doesn't match any group. Double-check and try again."
          : err instanceof ApiError && err.status === 409
            ? "You're already in this group."
            : "Something went wrong. Please try again."
      );
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteGroup = (groupId: string, name: string) => {
    Alert.alert("Delete group", `Delete "${name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiClient.deleteGroup(groupId);
            await qc.invalidateQueries({ queryKey: ["groups"] });
            setExpandedIds((prev) => {
              const next = new Set(prev);
              next.delete(groupId);
              return next;
            });
          } catch (err) {
            Alert.alert("Couldn't delete group", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  const handleRemoveMember = (groupId: string, targetUserId: string, name: string) => {
    Alert.alert("Remove member", `Remove ${name} from this group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiClient.removeGroupMember(groupId, targetUserId);
            await qc.invalidateQueries({ queryKey: ["groups"] });
          } catch (err) {
            Alert.alert("Couldn't remove member", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  const handleMove = async (groupId: string, direction: "up" | "down") => {
    const list = groups.data ?? [];
    const idx = list.findIndex((g) => g.id === groupId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === list.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newOrder = list.map((g, i) => {
      if (i === idx) return { groupId: g.id, displayOrder: list[swapIdx]!.displayOrder };
      if (i === swapIdx) return { groupId: g.id, displayOrder: list[idx]!.displayOrder };
      return { groupId: g.id, displayOrder: g.displayOrder };
    });
    try {
      await ApiClient.reorderGroups(newOrder);
      await qc.invalidateQueries({ queryKey: ["groups"] });
    } catch (err) {
      Alert.alert("Couldn't reorder", err instanceof ApiError ? err.message : "Please try again.");
      qc.invalidateQueries({ queryKey: ["groups"] });
    }
  };

  const groupList = groups.data ?? [];

  return (
    <Screen edges={["top"]}>
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg px-6 py-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />
          }
        >
          <ScreenHeader eyebrow="Your Reading" title="Devotionals" />

          {/* ── Personal devotional (relocated from the former Devotionals tab) ── */}
          <SectionLabel label="Personal" />

          {active.isLoading ? (
            <ActivityIndicator color={primary} />
          ) : active.data ? (
            <View className="overflow-hidden rounded-xl border border-border bg-card">
              <View className="flex-row items-center gap-3 px-4 py-5">
                <View style={{ width: 3, height: 40, borderRadius: 2, backgroundColor: primary }} />
                <View className="flex-1">
                  <Text className="font-serif text-lg font-bold text-foreground">
                    {active.data.planTitle}
                  </Text>
                  <Text className="mt-0.5 text-sm text-muted-foreground">
                    {active.data.chapter ? `${active.data.chapter} · ` : ""}
                    Day {active.data.currentDay}/{active.data.totalDays}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/devotional/${active.data!.planId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={active.data.doneToday || localDone ? "Done today — tap to re-read" : "Continue reading"}
                >
                  {active.data.doneToday || localDone ? (
                    <View className="flex-row items-center gap-1">
                      <PopIn>
                        <CheckCircle2 size={15} color={primary} />
                      </PopIn>
                      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Done today
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-sm font-semibold uppercase tracking-wider text-primary">
                      Continue
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <EmptyNote text="You don't have an active personal plan. Browse plans to start one." />
          )}

          <Divider />

          {/* ── Groups ─────────────────────────────────────────────────────────── */}
          <SectionLabel label="Groups" />

          {groups.isLoading ? (
            <ActivityIndicator color={primary} />
          ) : groups.isError ? (
            <ErrorState
              message="We couldn't load your groups. Check your connection and try again."
              onRetry={() => groups.refetch()}
            />
          ) : groupList.length === 0 ? (
            <View className="items-center px-4 py-6">
              <Text className="mb-1 font-serif text-xl font-bold text-foreground">No groups yet</Text>
              <Text className="mb-6 text-center text-sm text-muted-foreground">
                Walk through the Word with others — start a group or join one.
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setShowCreate(true)}
                  className="h-11 items-center justify-center rounded-xl bg-primary px-6"
                >
                  <Text className="text-sm font-semibold text-primary-foreground">Create</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowJoin(true)}
                  style={{ borderWidth: 1, borderColor: border }}
                  className="h-11 items-center justify-center rounded-xl px-6"
                >
                  <Text style={{ color: fg }} className="text-sm font-semibold">Join with Code</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
          {groupList.map((group, idx) => {
            const config = GROUP_TYPE_CONFIG[group.groupType] ?? { label: group.groupType, color: primary };
            const doneCount = group.members.filter((m) => m.doneToday).length;
            const isOpen = expandedIds.has(group.id);
            const isFirst = idx === 0;
            const isLast = idx === groupList.length - 1;

            return (
              <View
                key={group.id}
                style={{
                  marginBottom: 8,
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: border,
                  backgroundColor: card,
                }}
              >
                {/* Collapsed row */}
                <View className="flex-row items-center gap-3 px-3 py-5">
                  {/* Up / Down order buttons */}
                  <View style={{ gap: 4 }}>
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); handleMove(group.id, "up"); }}
                      hitSlop={6}
                      disabled={isFirst}
                      style={{ opacity: isFirst ? 0.2 : 1 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${group.name} up`}
                    >
                      <ArrowUp size={16} color={muted} />
                    </Pressable>
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); handleMove(group.id, "down"); }}
                      hitSlop={6}
                      disabled={isLast}
                      style={{ opacity: isLast ? 0.2 : 1 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${group.name} down`}
                    >
                      <ArrowDown size={16} color={muted} />
                    </Pressable>
                  </View>

                  <View style={{ width: 3, height: 40, borderRadius: 2, backgroundColor: config.color }} />

                  <Pressable
                    onPress={() => toggle(group.id)}
                    className="flex-1 flex-row items-center"
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${group.name}`}
                    accessibilityState={{ expanded: isOpen }}
                  >
                    <View className="flex-1">
                      <Text className="font-serif text-lg font-bold text-foreground">
                        {group.name}
                      </Text>
                      <Text className="mt-0.5 text-sm text-muted-foreground">
                        {config.label}
                        {group.plan?.chapter ? ` · ${group.plan.chapter}` : ""}
                        {` · ${doneCount}/${group.members.length} today`}
                      </Text>
                    </View>
                    {isOpen ? <ChevronUp size={20} color={muted} /> : <ChevronDown size={20} color={muted} />}
                  </Pressable>
                </View>

                {/* Expanded */}
                {isOpen && (
                  <View style={{ borderTopWidth: 1, borderTopColor: border }} className="px-4 py-3 gap-4">
                    {/* Members */}
                    <View className="gap-2">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, color: muted, letterSpacing: 1, textTransform: "uppercase" }}>
                          Members
                        </Text>
                        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, color: muted, letterSpacing: 1, textTransform: "uppercase" }}>
                          Completed
                        </Text>
                      </View>
                      {group.members.length === 0 ? (
                        <Text className="text-xs text-muted-foreground">No members yet.</Text>
                      ) : (
                        group.members.map((member) => (
                          <View key={member.id} className="flex-row items-center justify-between">
                            <Text className="text-sm text-foreground">{member.displayName}</Text>
                            <View className="flex-row items-center gap-3">
                              {member.doneToday
                                ? <CheckCircle2 size={16} color={config.color} />
                                : <Circle size={16} color={muted} />
                              }
                              <Pressable
                                hitSlop={8}
                                onPress={() => handleRemoveMember(group.id, member.userId, member.displayName)}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${member.displayName} from group`}
                              >
                                <X size={13} color={muted} />
                              </Pressable>
                            </View>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Discipleship (one-on-one only) */}
                    {group.groupType === "one-on-one" && (
                      <DiscipleshipSection
                        group={group}
                        rel={(discipleships.data ?? []).find((r) => r.groupId === group.id)}
                        myUserId={profile.data?.userId}
                        accent={config.color}
                      />
                    )}

                    {/* Actions row */}
                    <View className="flex-row gap-3">
                      {group.plan && (
                        <Pressable
                          onPress={() => router.push(`/devotional/${group.plan!.id}?groupId=${group.id}`)}
                          style={{ borderWidth: 1, borderColor: config.color, borderRadius: 8, backgroundColor: config.color + "15" }}
                          className="flex-row items-center gap-1.5 px-3 py-2"
                        >
                          <BookOpen size={13} color={config.color} />
                          <Text style={{ color: config.color, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                            Open Devotional
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => { setEditGroup(group); setEditName(group.name); }}
                        style={{ borderWidth: 1, borderColor: border, borderRadius: 8 }}
                        className="flex-row items-center gap-1.5 px-3 py-2"
                      >
                        <Pencil size={13} color={muted} />
                        <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteGroup(group.id, group.name)}
                        style={{ borderWidth: 1, borderColor: "#ef444440", borderRadius: 8, backgroundColor: "#ef444410" }}
                        className="flex-row items-center gap-1.5 px-3 py-2"
                      >
                        <Trash2 size={13} color="#ef4444" />
                        <Text style={{ color: "#ef4444", fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {/* Footer actions */}
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <Pressable
              onPress={() => setShowCreate(true)}
              className="flex-row items-center gap-1.5 py-3"
            >
              <Plus size={15} color={primary} />
              <Text style={{ color: primary }} className="text-sm font-semibold">New group</Text>
            </Pressable>
            <Text style={{ color: border }}>·</Text>
            <Pressable
              onPress={() => setShowJoin(true)}
              className="flex-row items-center gap-1.5 py-3"
            >
              <Link size={15} color={primary} />
              <Text style={{ color: primary }} className="text-sm font-semibold">Join with code</Text>
            </Pressable>
          </View>
            </>
          )}
        </ScrollView>

      {/* ── Create group modal ─────────────────────────────────────────────── */}
      <BottomSheet visible={showCreate} onClose={() => !creating && closeCreate()}>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-serif text-xl font-bold text-foreground">
                {createStep === 1 ? "New Group" : createdGroup?.name ?? "Group Created"}
              </Text>
              <Pressable
                onPress={closeCreate}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={muted} />
              </Pressable>
            </View>

            {createStep === 1 ? (
              <>
                <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Group Name</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. The Forge"
                  placeholderTextColor={muted}
                  style={{
                    borderWidth: 1, borderColor: border, borderRadius: 10,
                    padding: 12, color: fg, backgroundColor: card,
                    marginBottom: 20, fontSize: 15, fontFamily: "DMSans_400Regular",
                  }}
                />

                <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Group Type</Text>
                <View className="mb-6 gap-2">
                  {GROUP_TYPE_KEYS.map((key) => {
                    const val = GROUP_TYPE_CONFIG[key]!;
                    const selected = newType === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setNewType(key)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={{
                          borderWidth: 1.5,
                          borderColor: selected ? val.color : border,
                          borderRadius: 10, padding: 12,
                          flexDirection: "row", alignItems: "center", gap: 10,
                          backgroundColor: selected ? val.color + "18" : "transparent",
                        }}
                      >
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: val.color }} />
                        <Text style={{ color: selected ? val.color : fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                          {val.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={handleCreate}
                  disabled={!newName.trim() || creating}
                  style={{ opacity: !newName.trim() || creating ? 0.5 : 1 }}
                  className="h-12 items-center justify-center rounded-xl bg-primary"
                >
                  <Text className="font-semibold text-primary-foreground">
                    {creating ? "Creating…" : "Create Group"}
                  </Text>
                </Pressable>
              </>
            ) : createdGroup ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, marginBottom: 20 }}>
                  Your group is ready. Share the invite code or add people directly.
                </Text>
                <View style={{ marginBottom: 24 }}>
                  <InviteCodeRow
                    inviteCode={createdGroup.inviteCode}
                    accent={GROUP_TYPE_CONFIG[createdGroup.groupType]?.color ?? primary}
                    muted={muted} border={border} card={card}
                  />
                </View>
                <View style={{ marginBottom: 24 }}>
                  <MemberSearch
                    groupId={createdGroup.id}
                    existingUserIds={new Set(createdGroup.members.map((m) => m.userId))}
                    accent={GROUP_TYPE_CONFIG[createdGroup.groupType]?.color ?? primary}
                    muted={muted} border={border} card={card} bg={bg} fg={fg}
                    onAdded={() => qc.invalidateQueries({ queryKey: ["groups"] })}
                  />
                </View>
                <Pressable
                  onPress={closeCreate}
                  className="h-12 items-center justify-center rounded-xl bg-primary"
                >
                  <Text className="font-semibold text-primary-foreground">Done</Text>
                </Pressable>
              </ScrollView>
            ) : null}
      </BottomSheet>

      {/* ── Edit group sheet ───────────────────────────────────────────────── */}
      <BottomSheet visible={!!editGroup} onClose={() => !saving && setEditGroup(null)}>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-serif text-xl font-bold text-foreground">Edit Group</Text>
              <Pressable
                onPress={() => setEditGroup(null)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Group Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor={muted}
                style={{
                  borderWidth: 1, borderColor: border, borderRadius: 10,
                  padding: 12, color: fg, backgroundColor: card,
                  marginBottom: 16, fontSize: 15, fontFamily: "DMSans_400Regular",
                }}
              />
              <Pressable
                onPress={handleSaveEdit}
                disabled={!editName.trim() || saving}
                style={{ opacity: !editName.trim() || saving ? 0.5 : 1 }}
                className="mb-6 h-11 items-center justify-center rounded-xl bg-primary"
              >
                <Text className="font-semibold text-primary-foreground">
                  {saving ? "Saving…" : "Save Name"}
                </Text>
              </Pressable>

              <View style={{ height: 1, backgroundColor: border, marginBottom: 24 }} />

              {editGroup && (
                <View style={{ marginBottom: 24 }}>
                  <InviteCodeRow
                    inviteCode={editGroup.inviteCode}
                    accent={GROUP_TYPE_CONFIG[editGroup.groupType]?.color ?? primary}
                    muted={muted} border={border} card={card}
                  />
                </View>
              )}

              <View style={{ height: 1, backgroundColor: border, marginBottom: 24 }} />

              {editGroup && (
                <MemberSearch
                  groupId={editGroup.id}
                  existingUserIds={new Set(editGroup.members.map((m) => m.userId))}
                  accent={GROUP_TYPE_CONFIG[editGroup.groupType]?.color ?? primary}
                  muted={muted} border={border} card={card} bg={bg} fg={fg}
                  onAdded={() => qc.invalidateQueries({ queryKey: ["groups"] })}
                />
              )}
            </ScrollView>
      </BottomSheet>

      {/* ── Join by code sheet ─────────────────────────────────────────────── */}
      <BottomSheet visible={showJoin} onClose={() => !joining && setShowJoin(false)}>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-serif text-xl font-bold text-foreground">Join a Group</Text>
              <Pressable
                onPress={() => setShowJoin(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={muted} />
              </Pressable>
            </View>

            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, marginBottom: 16 }}>
              Enter the invite code shared with you.
            </Text>

            <TextInput
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="e.g. AB12CD"
              placeholderTextColor={muted}
              autoCapitalize="characters"
              style={{
                borderWidth: 1, borderColor: border, borderRadius: 10,
                padding: 14, color: fg, backgroundColor: card,
                marginBottom: 20, fontSize: 22, fontFamily: "DMSans_700Bold",
                // Space out the typed code for readability, but keep the empty
                // placeholder at normal spacing (letterSpacing also spreads the
                // placeholder, which made "e.g. AB12CD" look broken).
                letterSpacing: joinCode ? 4 : 0, textAlign: "center",
              }}
            />

            <Pressable
              onPress={handleJoin}
              disabled={!joinCode.trim() || joining}
              style={{ opacity: !joinCode.trim() || joining ? 0.5 : 1 }}
              className="h-12 items-center justify-center rounded-xl bg-primary"
            >
              <Text className="font-semibold text-primary-foreground">
                {joining ? "Joining…" : "Join Group"}
              </Text>
            </Pressable>
      </BottomSheet>
    </Screen>
  );
}
