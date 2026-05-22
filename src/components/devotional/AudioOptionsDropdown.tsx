import { useEffect, useRef, useState } from "react";
import { Play, Headphones, Car } from "lucide-react";

interface Props {
  onListenOnly: () => void;
  onCommuteMode: () => void;
}

const AudioOptionsDropdown = ({ onListenOnly, onCommuteMode }: Props) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        aria-label="Audio options"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--commute-blue))] text-white shadow-sm transition-transform hover:scale-105"
      >
        <Play className="h-4 w-4 fill-current" />
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-12 z-50 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
        >
          <p
            className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase text-muted-foreground"
            style={{ letterSpacing: "1.5px" }}
          >
            Audio Options
          </p>

          <button
            onClick={() => { setOpen(false); onListenOnly(); }}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Headphones className="h-4 w-4 text-foreground" strokeWidth={1.8} />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-[13px] font-bold">Listen Only</span>
              <span className="block text-[11px] italic text-muted-foreground">Reads the devotional aloud</span>
            </span>
          </button>

          <div className="my-1 h-px bg-border" />

          <button
            onClick={() => { setOpen(false); onCommuteMode(); }}
            className="flex w-full items-center gap-3 rounded-xl bg-[hsl(var(--commute-blue-pale))] p-2 text-left transition-colors hover:brightness-105"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--commute-blue))]">
              <Car className="h-4 w-4 text-white" strokeWidth={1.8} />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-[13px] font-bold text-[hsl(var(--commute-blue-ink))]">Commute Mode</span>
              <span className="block text-[11px] italic text-muted-foreground">Hands-free — reads &amp; records</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioOptionsDropdown;