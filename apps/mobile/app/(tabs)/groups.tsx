import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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
  ChevronRight,
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
  X,
} from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BottomSheet } from "@/components/BottomSheet";
import { useToast } from "@/components/Toast";
import { InviteCodeRow, MemberSearch } from "@/components/GroupInvite";
import { Avatar } from "@/components/Avatar";
import { useGroups, useDiscipleships, useProfile } from "@/lib/queries";
import { GROUP_TYPE_CONFIG } from "@/lib/groupTypes";
import {
  ApiClient,
  ApiError,
  type Group,
  type DiscipleshipRelationship,
} from "@/lib/api";

// ─── Section helpers (ported from the former Devotionals tab) ─────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
      {label}
    </Text>
  );
}

function Divider() {
  const border = useThemeColor("border");
  return <View style={{ height: 1, backgroundColor: border, marginVertical: 24 }} />;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

// Bottom-sheet modal shared by the edit / join flows. Lifts above the
// keyboard (so inputs aren't hidden), and tapping the dimmed backdrop closes it
// while taps inside the sheet are absorbed by the inner Pressable.
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
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const primary = useThemeColor("primary");
  return (
    <BottomSheet visible={visible} onClose={onDecline}>
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
    </BottomSheet>
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
      style={{ borderWidth: 1, borderColor: color, borderRadius: 8, backgroundColor: withAlpha(color, 0.12) }}
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

// Per-group discipleship: the *invite* lives here, because this is where you
// pick the person. Once a relationship exists it's managed in the top-level
// Discipleship hub, so the card just points there.
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
  const toast = useToast();
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");

  const other = group.members.find((m) => m.userId !== myUserId);

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
            try {
              await ApiClient.inviteDisciple(group.id, other.userId);
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["discipleship"] }),
                qc.invalidateQueries({ queryKey: ["groups"] }),
              ]);
              toast.show("Invite sent");
            } catch (err) {
              Alert.alert("Couldn't invite", err instanceof ApiError ? err.message : "Please try again.");
            }
          },
        },
      ]
    );
  };

  let body: ReactNode;
  if (!rel) {
    body = other ? (
      <>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, lineHeight: 17 }}>
          Walk one-on-one — you'll see {other.displayName}'s responses as they submit, can send a daily
          question, and message privately.
        </Text>
        <DiscipleChip icon={HeartHandshake} label="Start discipleship" color={accent} onPress={handleInvite} />
      </>
    ) : (
      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, fontStyle: "italic" }}>
        Add the other person to this group to start discipleship.
      </Text>
    );
  } else {
    body = (
      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, fontStyle: "italic" }}>
        {rel.status === "pending"
          ? "Invite pending — manage it in Discipleship at the top of this tab."
          : "Active — open responses, flags, and the mailbox from Discipleship at the top of this tab."}
      </Text>
    );
  }

  return (
    <View className="gap-2" style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 12 }}>
      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: muted, letterSpacing: 1, textTransform: "uppercase" }}>
        Discipleship
      </Text>
      {body}
    </View>
  );
}

// Top-level discipleship hub: lists every relationship (pending + active) with
// its entry points, so active discipleships aren't buried inside an expanded
// group card. Accepting or declining an invite happens right here too.
function DiscipleshipHub({
  relationships,
  onStartOneOnOne,
  accent,
}: {
  relationships: DiscipleshipRelationship[];
  onStartOneOnOne: () => void;
  accent: string;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");
  const [reviewRel, setReviewRel] = useState<DiscipleshipRelationship | null>(null);
  const [busy, setBusy] = useState(false);

  // "ended" relationships shouldn't clutter the hub.
  const live = relationships.filter((r) => r.status !== "ended");

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["discipleship"] }),
      qc.invalidateQueries({ queryKey: ["groups"] }),
    ]);

  const handleAccept = async () => {
    if (!reviewRel) return;
    setBusy(true);
    try {
      await ApiClient.acceptDiscipleship(reviewRel.id);
      await refresh();
      setReviewRel(null);
    } catch (err) {
      Alert.alert("Couldn't accept", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!reviewRel) return;
    setBusy(true);
    try {
      await ApiClient.declineDiscipleship(reviewRel.id);
      await refresh();
      setReviewRel(null);
    } catch (err) {
      Alert.alert("Couldn't decline", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Discipler cancels a pending invite they sent.
  const handleCancelInvite = (rel: DiscipleshipRelationship) => {
    Alert.alert("Cancel invite", `Cancel your discipleship invite to ${rel.counterpart.displayName}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel invite",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiClient.declineDiscipleship(rel.id);
            await refresh();
          } catch (err) {
            Alert.alert("Couldn't cancel", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View>
      <SectionLabel label="Discipleship" />
      {live.length === 0 ? (
        <View style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 16 }}>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, lineHeight: 21, marginBottom: 14 }}>
            Walk with one person, one-on-one — see each other's responses, send a daily question, and
            message privately. Start by creating a one-on-one group together.
          </Text>
          <Button title="Start a one-on-one" variant="outline" onPress={onStartOneOnOne} />
        </View>
      ) : (
        live.map((rel) => {
          const isDiscipler = rel.role === "discipler";

          // Pending: not yet a live relationship — review/accept or wait here.
          if (rel.status === "pending") {
            return (
              <View
                key={rel.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 12, marginBottom: 8 }}
              >
                <Avatar name={rel.counterpart.displayName} url={rel.counterpart.avatarUrl} accent={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 15, color: fg }} numberOfLines={1}>
                    {rel.counterpart.displayName}
                  </Text>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted }}>
                    {isDiscipler ? "Invite pending" : "Invited you to disciple"}
                  </Text>
                </View>
                {isDiscipler ? (
                  <Pressable
                    onPress={() => handleCancelInvite(rel)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel invite"
                    style={{ paddingHorizontal: 6, paddingVertical: 6 }}
                  >
                    <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: muted }}>Cancel</Text>
                  </Pressable>
                ) : (
                  <DiscipleChip icon={HeartHandshake} label="Review" color={accent} onPress={() => setReviewRel(rel)} />
                )}
              </View>
            );
          }

          // Active: the whole card opens the one relationship screen.
          return (
            <Pressable
              key={rel.id}
              onPress={() => router.push(`/discipleship/${rel.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open discipleship with ${rel.counterpart.displayName}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 12, marginBottom: 8 }}
            >
              <Avatar name={rel.counterpart.displayName} url={rel.counterpart.avatarUrl} accent={accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 15, color: fg }} numberOfLines={1}>
                  {rel.counterpart.displayName}
                </Text>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted }}>
                  {isDiscipler ? "You're discipling them" : "Your discipler"}
                </Text>
              </View>
              {rel.unreadCount > 0 ? (
                <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 11 }}>{rel.unreadCount}</Text>
                </View>
              ) : null}
              <ChevronRight size={18} color={muted} />
            </Pressable>
          );
        })
      )}

      <PrivacyNoticeModal
        visible={!!reviewRel}
        disciplerName={reviewRel?.counterpart.displayName ?? "Someone"}
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
  const discipleships = useDiscipleships();
  const profile = useProfile();
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const bg = useThemeColor("background");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");
  const destructive = useThemeColor("destructive");
  const destructiveBorder = useThemeColor("destructive", 0.25);
  const destructiveBg = useThemeColor("destructive", 0.06);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["progress", "active"] }),
      qc.invalidateQueries({ queryKey: ["groups"] }),
    ]);
    setRefreshing(false);
  };

  // Edit flow
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Join by code
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Delete group (plain destructive confirm — no typing required)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

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

  // Entry point for starting discipleship from the hub: opens the unified
  // create flow pre-set to a one-on-one group.
  const startOneOnOne = () => router.push("/plans/new?type=one-on-one");

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
      toast.show(`Joined ${group.name}`);
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

  const confirmDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeletingGroup(true);
    try {
      await ApiClient.deleteGroup(deleteTarget.id);
      await qc.invalidateQueries({ queryKey: ["groups"] });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      Alert.alert("Couldn't delete group", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setDeletingGroup(false);
    }
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
          <ScreenHeader eyebrow="Read together" title="Plans" />

          {/* ── Discipleship ───────────────────────────────────────────────────── */}
          <DiscipleshipHub
            relationships={discipleships.data ?? []}
            onStartOneOnOne={startOneOnOne}
            accent={primary}
          />

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
                  onPress={() => router.push("/plans/new")}
                  className="h-11 items-center justify-center rounded-xl bg-primary px-6"
                >
                  <Text className="text-sm font-semibold text-primary-foreground">New plan</Text>
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
                      onPress={(e) => { e.stopPropagation(); handleMove(group.id, "up"); }}
                      hitSlop={6}
                      disabled={isFirst}
                      style={{ opacity: isFirst ? 0.2 : 1 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${group.name} up`}
                    >
                      <ArrowUp size={16} color={muted} />
                    </Pressable>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); handleMove(group.id, "down"); }}
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
                        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: muted, letterSpacing: 1, textTransform: "uppercase" }}>
                          Members
                        </Text>
                        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: muted, letterSpacing: 1, textTransform: "uppercase" }}>
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
                      {group.plan ? (
                        <Pressable
                          onPress={() => router.push(`/devotional/${group.plan!.id}?groupId=${group.id}`)}
                          style={{ borderWidth: 1, borderColor: config.color, borderRadius: 8, backgroundColor: withAlpha(config.color, 0.12) }}
                          className="flex-row items-center gap-1.5 px-3 py-2"
                        >
                          <BookOpen size={13} color={config.color} />
                          <Text style={{ color: config.color, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                            Open Devotional
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => router.push(`/plans/new?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`)}
                          style={{ borderWidth: 1, borderColor: config.color, borderRadius: 8, backgroundColor: withAlpha(config.color, 0.12) }}
                          className="flex-row items-center gap-1.5 px-3 py-2"
                        >
                          <BookOpen size={13} color={config.color} />
                          <Text style={{ color: config.color, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                            Choose a plan
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
                        onPress={() => setDeleteTarget(group)}
                        style={{ borderWidth: 1, borderColor: destructiveBorder, borderRadius: 8, backgroundColor: destructiveBg }}
                        className="flex-row items-center gap-1.5 px-3 py-2"
                      >
                        <Trash2 size={13} color={destructive} />
                        <Text style={{ color: destructive, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
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
              onPress={() => router.push("/plans/new")}
              className="flex-row items-center gap-1.5 py-3"
            >
              <Plus size={15} color={primary} />
              <Text style={{ color: primary }} className="text-sm font-semibold">New plan</Text>
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
              <Input
                value={editName}
                onChangeText={setEditName}
                style={{ marginBottom: 16 }}
              />
              <Button
                title="Save Name"
                onPress={handleSaveEdit}
                disabled={!editName.trim()}
                loading={saving}
                style={{ marginBottom: 24 }}
              />

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

            <Button
              title="Join Group"
              onPress={handleJoin}
              disabled={!joinCode.trim()}
              loading={joining}
            />
      </BottomSheet>

      {/* ── Delete group confirmation ──────────────────────────────────────── */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete group"
        message={
          deleteTarget
            ? `This permanently deletes "${deleteTarget.name}" for all ${deleteTarget.members.length} member${
                deleteTarget.members.length === 1 ? "" : "s"
              } and can't be undone.`
            : ""
        }
        confirmLabel="Delete group"
        destructive
        busy={deletingGroup}
        onConfirm={confirmDeleteGroup}
        onCancel={() => !deletingGroup && setDeleteTarget(null)}
      />
    </Screen>
  );
}
