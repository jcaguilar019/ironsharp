// The em dash is the classic LLM tell, and the app's voice bans it. The plan
// generator's prompt tells the model not to use them; this is the
// belt-and-suspenders guarantee for any that slip through. Each dash becomes the
// punctuation its context calls for (a comma pause) and the swap's artifacts are
// tidied, so the grammar stays intact.
//
// Deliberately left alone: single hyphens ("self-worth") and numeric en-dash
// ranges ("v2–4", "Psalm 1–3"), which are correct usage, not tells.
export function deDash(input: string): string {
  return input
    // Em dash, or a "--" surrogate, spaced or tight → a comma pause.
    .replace(/\s*(?:—|--)\s*/g, ", ")
    // En dash used as a prose dash: spaces on BOTH sides. Ranges (no spaces) stay.
    .replace(/(\S)\s+–\s+(\S)/g, "$1, $2")
    // Tidy the artifacts a swap can leave behind.
    .replace(/\s+,/g, ",") // " ," → ","
    .replace(/,\s*,/g, ",") // ",," → ","
    .replace(/,\s*([.;:!?])/g, "$1") // ", ." → "."
    .replace(/^\s*,\s*/g, "") // leading ", " (dash opened the string)
    .replace(/,\s*$/g, "") // trailing ", " (dash closed the string)
    .replace(/\s{2,}/g, " ")
    .trim();
}
