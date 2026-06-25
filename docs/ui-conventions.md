# IronSharp mobile UI conventions

How feedback and form controls should be built. New screens follow these; older
one-offs get migrated opportunistically.

## Feedback: which pattern, when

| Situation | Use | Example |
|---|---|---|
| Transient success, or you navigate away | **Toast** — `useToast().show("…")` | "Joined Men's Group", "Invite sent", "Code applied" |
| Success tied to a form/section the user is looking at | **Inline confirmation** near the action | "Shared with the community ✓" under the Community post button |
| Destructive / irreversible confirmation | **`ConfirmModal`** (`confirmPhrase` for type-to-confirm) | Delete group |
| Recoverable error | **Inline error** near the field; `Alert` only if there's no field | promo-code error under the input |
| OS-level prompt | **native `Alert` / system dialog** | camera / mic / notification permission |

Rules of thumb:
- **Never use a blocking `Alert` to confirm a success** — it interrupts the flow and
  ignores the theme. Use a toast or an inline confirmation.
- **Reserve native `Alert`** for (a) OS permission prompts and (b) genuine errors with
  no natural inline home.
- Toasts are for *positive, transient* messages only — never errors that need action.
  One at a time, auto-dismisses (~2.4s), keep it short (≤ ~40 chars).

`useToast()` works anywhere under the app root — `ToastProvider` wraps the navigator
in `app/_layout.tsx`.

## Form controls: shared components first

- **Buttons** → `@/components/Button`. Variants: `primary` (default), `outline`, `dark`,
  `destructive`. Use `loading` for async (it shows a spinner — don't also swap the title
  to "Saving…"); `disabled` handles the dimmed state. Full-width by default.
- **Text fields** → `@/components/Input`. Supports `label`, `hint`, and `multiline`
  (auto min-height + top alignment). Pass `style` only for layout (e.g. `marginBottom`),
  not to restyle the field.

Prefer these over hand-rolled `Pressable`/`TextInput`. Inline-styled controls are the
**exception**, allowed only for widgets the shared components don't model:
- **Code entry** (group invite code, promo code) — large, centered, letter-spaced.
- **Search bars** — leading icon + clear button.
- **Chat / question composers** — pill input paired with a send button.
- **Chips / segmented toggles** — small, inline.

If you're copying a `borderWidth/borderColor/borderRadius/padding` block onto a
`TextInput`, reach for `Input` instead.

## Adoption status (as of 2026-06)
Migrated: auth, onboarding, edit-profile, the social screens (group create/edit/join
sheets, community response form), and the membership Redeem action. Remaining one-offs
to migrate opportunistically: the community **admin** authoring tool, the plan **create**
wizard, and the devotional reader's answer inputs. The specialized widgets above
intentionally stay bespoke.
