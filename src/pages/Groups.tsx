import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { ChevronDown, ChevronUp, UserPlus, Settings, Plus, Check, Minus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  members: Member[];
}

const mockGroups: GroupData[] = [
  {
    id: "1",
    name: "Marcus & Me",
    type: "one-on-one",
    reference: "James 1",
    day: 5,
    totalDays: 7,
    streak: 5,
    members: [
      { name: "You", role: "Partner", doneToday: true },
      { name: "Marcus", role: "Partner", doneToday: true },
    ],
  },
  {
    id: "2",
    name: "Aguilar Family",
    type: "family",
    reference: "Psalm 23",
    day: 3,
    totalDays: 14,
    streak: 3,
    members: [
      { name: "You", role: "Parent", doneToday: true },
      { name: "Sarah", role: "Parent", doneToday: true },
      { name: "Eli", role: "Youth", doneToday: false },
      { name: "Grace", role: "Youth", doneToday: false },
    ],
  },
  {
    id: "3",
    name: "The Forge",
    type: "small-group",
    reference: "Romans 8",
    day: 10,
    totalDays: 30,
    streak: 7,
    members: [
      { name: "You", role: "Leader", doneToday: true },
      { name: "Marcus", role: "Member", doneToday: true },
      { name: "David", role: "Member", doneToday: true },
      { name: "James", role: "Member", doneToday: false },
      { name: "Peter", role: "Member", doneToday: false },
    ],
  },
];

const Groups = () => {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ORDER_KEY = "ironsharp.groups_order";
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Ensure any new groups not in saved order are appended
        const ids = mockGroups.map((g) => g.id);
        const merged = [...parsed.filter((id) => ids.includes(id)), ...ids.filter((id) => !parsed.includes(id))];
        return merged;
      }
    } catch {}
    return mockGroups.map((g) => g.id);
  });
  const [dragId, setDragId] = useState<string | null>(null);

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
    .map((id) => mockGroups.find((g) => g.id === id))
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
                          navigator.clipboard.writeText("IRON2024");
                          toast({ title: "Invite code copied!" });
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
