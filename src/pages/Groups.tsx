import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { ChevronDown, ChevronUp, UserPlus, Settings, Plus, Check, Minus, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const typeColors: Record<string, string> = {
  "one-on-one": "#A89070",
  family: "#7FAF8A",
  "small-group": "#B8A86A",
};

const typeLabels: Record<string, string> = {
  "one-on-one": "One-on-One",
  family: "Family",
  "small-group": "Small Group",
};

interface Member {
  userId: string;
  name: string;
  role: string;
  doneToday: boolean;
}

interface GroupData {
  id: string;
  name: string;
  type: "one-on-one" | "family" | "small-group";
  reference: string;
  day: number;
  totalDays: number;
  streak: number;
  inviteCode: string;
  members: Member[];
}

const Groups = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const ORDER_KEY = "ironsharp.groups_order";
  const [order, setOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // 1. Groups the user is a member of
      const { data: gms } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const groupIds = (gms || []).map((g) => g.group_id);
      if (!groupIds.length) { setGroups([]); setLoading(false); return; }

      // 2. Group details
      const { data: gs } = await supabase
        .from("groups")
        .select("id, name, group_type, current_plan_id, current_day, streak_count, invite_code")
        .in("id", groupIds);

      // 3. All members across those groups
      const { data: members } = await supabase
        .from("group_members")
        .select("group_id, user_id, member_role")
        .in("group_id", groupIds);

      // 4. Profiles for those members
      const memberIds = Array.from(new Set((members || []).map((m) => m.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", memberIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.display_name as string]));

      // 5. Plans + day chapter
      const planIds = Array.from(new Set((gs || []).map((g) => g.current_plan_id).filter(Boolean))) as string[];
      const { data: plans } = planIds.length
        ? await supabase.from("devotional_plans").select("id, title, total_days").in("id", planIds)
        : { data: [] as any[] };
      const planMap = new Map((plans || []).map((p) => [p.id, p]));
      const { data: days } = planIds.length
        ? await supabase.from("devotional_days").select("plan_id, day_number, chapter").in("plan_id", planIds)
        : { data: [] as any[] };

      // 6. Today's submissions for those members at each group's current day
      const { data: subs } = await supabase
        .from("devotional_submissions")
        .select("user_id, plan_id, day_number, submitted_at")
        .in("user_id", memberIds);
      const today = new Date(); today.setHours(0,0,0,0);
      const submittedKey = new Set(
        (subs || [])
          .filter((s) => new Date(s.submitted_at) >= today)
          .map((s) => `${s.user_id}|${s.plan_id}|${s.day_number}`)
      );

      const built: GroupData[] = (gs || []).map((g) => {
        const plan = g.current_plan_id ? planMap.get(g.current_plan_id) : null;
        const day = (days || []).find((d) => d.plan_id === g.current_plan_id && d.day_number === g.current_day);
        const gMembers = (members || []).filter((m) => m.group_id === g.id).map((m) => ({
          userId: m.user_id,
          name: m.user_id === user.id ? "You" : (profileMap.get(m.user_id) || "Member"),
          role: m.member_role.charAt(0).toUpperCase() + m.member_role.slice(1),
          doneToday: g.current_plan_id
            ? submittedKey.has(`${m.user_id}|${g.current_plan_id}|${g.current_day}`)
            : false,
        }));
        return {
          id: g.id,
          name: g.name,
          type: g.group_type as GroupData["type"],
          reference: day?.chapter || (plan?.title ?? "No plan yet"),
          day: g.current_day,
          totalDays: plan?.total_days ?? 0,
          streak: g.streak_count,
          inviteCode: g.invite_code,
          members: gMembers,
        };
      });

      setGroups(built);
      // restore order
      try {
        const saved = localStorage.getItem(ORDER_KEY);
        const parsed = saved ? (JSON.parse(saved) as string[]) : [];
        const ids = built.map((g) => g.id);
        const merged = [...parsed.filter((id) => ids.includes(id)), ...ids.filter((id) => !parsed.includes(id))];
        setOrder(merged);
      } catch {
        setOrder(built.map((g) => g.id));
      }
      setLoading(false);
    })();
  }, [user]);

  const persistOrder = (next: string[]) => {
    setOrder(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch {}
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setDragId(null);
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    persistOrder(arrayMove(order, from, to));
  };

  const orderedGroups = order
    .map((id) => groups.find((g) => g.id === id))
    .filter(Boolean) as GroupData[];

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Your Relationships
        </p>
        <h1 className="font-serif text-2xl font-bold">Groups</h1>
        <p className="mb-4 mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Drag to reorder
        </p>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No groups yet. Start one below.
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setDragId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragId(null)}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderedGroups.map((group) => {
                const accent = typeColors[group.type];
                const expanded = expandedId === group.id;
                const doneCount = group.members.filter((m) => m.doneToday).length;
                return (
                  <SortableGroupRow
                    key={group.id}
                    group={group}
                    accent={accent}
                    expanded={expanded}
                    doneCount={doneCount}
                    isDragging={dragId === group.id}
                    onToggle={() => setExpandedId(expanded ? null : group.id)}
                  >
                    {expanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <div className="space-y-2">
                      {group.members.map((m) => (
                        <div
                          key={m.name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold"
                              style={{
                                backgroundColor: m.doneToday ? accent : "hsl(var(--muted))",
                                color: m.doneToday ? "#fff" : "hsl(var(--muted-foreground))",
                              }}
                            >
                              {m.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{m.name}</p>
                              <p className="text-[11px] text-muted-foreground">{m.role}</p>
                            </div>
                          </div>
                          {m.doneToday ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(group.inviteCode);
                          toast({ title: "Invite code copied!", description: group.inviteCode });
                        }}
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        Invite
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast({ title: "Settings coming soon" });
                        }}
                      >
                        <Settings className="mr-1 h-3.5 w-3.5" />
                        Settings
                      </Button>
                    </div>
                  </div>
                )}
                  </SortableGroupRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <button
          onClick={() => toast({ title: "New group flow coming soon" })}
          className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Start a new group
        </button>
      </div>
    </AppLayout>
  );
};

export default Groups;

interface SortableGroupRowProps {
  group: GroupData;
  accent: string;
  expanded: boolean;
  doneCount: number;
  isDragging: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const SortableGroupRow = ({
  group,
  accent,
  expanded,
  doneCount,
  isDragging,
  onToggle,
  children,
}: SortableGroupRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: group.id,
    disabled: expanded,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-xl border border-border bg-card ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex w-full items-center gap-3 px-3 py-3 text-left">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="touch-none -m-1 cursor-grab p-1 text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div
            className="h-8 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-sm font-semibold">{group.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {typeLabels[group.type]} · {group.reference} · {doneCount}/{group.members.length} today
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {children}
    </div>
  );
};
