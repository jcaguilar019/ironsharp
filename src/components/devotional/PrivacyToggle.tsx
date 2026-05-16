import { Lock, LockOpen } from "lucide-react";

interface PrivacyToggleProps {
  isPrivate: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

/**
 * Two-part privacy toggle: a circular lock pill + an iOS-style sliding switch.
 * Tapping anywhere on the row flips the state. Baby blue (#89B4C9) = private.
 */
const PrivacyToggle = ({ isPrivate, onChange, label }: PrivacyToggleProps) => {
  const toggle = () => onChange(!isPrivate);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isPrivate}
      aria-label={`${label} privacy: ${isPrivate ? "private" : "shared"}`}
      className="flex items-center gap-[7px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
    >
      {/* Lock icon pill — 26x26 */}
      <span
        className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] transition-colors duration-200"
        style={{
          backgroundColor: isPrivate ? "#89B4C9" : "transparent",
          borderColor: isPrivate ? "#89B4C9" : "hsl(var(--border))",
          color: isPrivate ? "#fff" : "hsl(var(--muted-foreground))",
        }}
      >
        {isPrivate ? (
          <Lock className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <LockOpen className="h-3.5 w-3.5" strokeWidth={2} />
        )}
      </span>
      {/* iOS switch — 40x22 */}
      <span
        className="relative inline-block transition-colors duration-200"
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          backgroundColor: isPrivate ? "#89B4C9" : "hsl(var(--muted))",
        }}
      >
        <span
          className="absolute top-1/2 block rounded-full bg-white transition-[left] duration-200"
          style={{
            width: 18,
            height: 18,
            left: isPrivate ? 20 : 2,
            transform: "translateY(-50%)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }}
        />
      </span>
    </button>
  );
};

export default PrivacyToggle;