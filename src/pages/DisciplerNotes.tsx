import AppLayout from "@/components/AppLayout";
import { ChevronLeft, Shield, Lock, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const mockNotes = [
  {
    id: 1,
    from: "Sarah",
    role: "Discipler",
    date: "May 2, 2026",
    note: "Juan, I noticed your reflection on Proverbs 27:6 was really honest this week. The vulnerability you showed about your relationship with your brother is exactly the kind of growth I've been praying for. Keep leaning into that discomfort — God is doing something there.",
    isPrivate: true,
  },
  {
    id: 2,
    from: "Juan",
    role: "You",
    date: "May 1, 2026",
    note: "Sarah, I've been struggling with consistency in my prayer life. The mornings are hardest. Any advice on how you built your routine?",
    isPrivate: true,
  },
  {
    id: 3,
    from: "Sarah",
    role: "Discipler",
    date: "Apr 29, 2026",
    note: "Great job staying consistent this past week. I want to challenge you: this week, try praying out loud during your devotional time. It changes the way you engage with Scripture. Also — don't skip the prayer/praise section. That's where the real transformation happens.",
    isPrivate: true,
  },
];

const DisciplerNotes = () => {
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState("");

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <button onClick={() => navigate("/home")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-serif text-2xl font-bold">Discipler Notes</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Private conversation with Sarah (your discipler)</span>
          </div>
        </div>

        {/* Notes thread */}
        <div className="mb-6 space-y-4">
          {mockNotes.map(note => (
            <div
              key={note.id}
              className={`rounded-xl border p-4 ${
                note.role === "You"
                  ? "border-primary/30 bg-primary/5 ml-6"
                  : "border-border bg-card mr-6"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {note.from[0]}
                  </div>
                  <div>
                    <span className="text-sm font-semibold">{note.from}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{note.role}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{note.date}</span>
              </div>
              <p className="text-sm leading-relaxed">{note.note}</p>
            </div>
          ))}
        </div>

        {/* Reply */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Reply to Sarah</p>
          <Textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Write a private note to your discipler..."
            className="mb-3 min-h-[80px] rounded-xl"
          />
          <Button className="h-10 w-full rounded-xl" disabled={!newNote.trim()}>
            <Send className="mr-2 h-4 w-4" /> Send Note
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default DisciplerNotes;