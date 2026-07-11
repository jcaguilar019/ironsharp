type TokenState = {
  tokensRemaining: number;
  tierLimit: number;
  resetsAt: string | null;
};

/**
 * The single gate for entering the AI plan generator, shared by the personal
 * browser and the group flow so the rules and copy can't drift. Returns the
 * alert to show, or null when generation is allowed.
 */
export function generateGate(tokens: TokenState | undefined): { title: string; message: string } | null {
  if (!tokens) return null; // still loading — let the server be the backstop
  if (tokens.tierLimit === 0) {
    return {
      title: "Upgrade required",
      message: "AI-generated plans are available on Connect and above.",
    };
  }
  if (tokens.tokensRemaining === 0) {
    const date = tokens.resetsAt
      ? new Date(tokens.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })
      : null;
    return {
      title: "You're all out",
      message: date ? `Your next token is available on ${date}.` : "You have no tokens remaining.",
    };
  }
  return null;
}
