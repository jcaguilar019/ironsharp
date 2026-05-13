# Fix drag-to-reorder on mobile

## Why it's broken

Both reorder lists use the browser's **native HTML5 drag-and-drop** (`draggable`, `onDragStart`, `onDrop`):

- `src/components/devotional/DevotionalHub.tsx` — Shared Plans list
- `src/pages/Groups.tsx` — Groups list

The HTML5 drag API only fires from mouse input. iOS Safari and most mobile browsers don't translate touches into drag events, so on a phone the tiles never start dragging. This is a well-known limitation, not a bug in your code.

## The fix

Replace the native drag handlers with **`@dnd-kit`** — the standard React DnD library that works seamlessly with both mouse and touch (via PointerSensor + TouchSensor with a small activation delay so taps still register as taps).

### Steps

1. Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
2. Refactor the **Shared Plans** list in `DevotionalHub.tsx`:
   - Wrap the list in `DndContext` + `SortableContext` (vertical strategy).
   - Make each row a `useSortable` item. Keep the `GripVertical` icon as the drag handle (attach listeners only to the handle so the rest of the card stays tappable for the "Coming soon" toast).
   - Persist the new order to `localStorage` exactly as today (`ironsharp.devotional_order`).
3. Same refactor in `Groups.tsx`:
   - Disable dragging when a group is `expanded` (preserve current behavior).
   - Keep all existing click/expand/long-press behavior intact.
4. Configure sensors so:
   - **Touch**: small delay (~150ms) + tolerance, so scrolling the page still works and quick taps are not hijacked.
   - **Mouse**: small distance threshold (~5px) so clicks still register normally on desktop.
5. Manual QA on the mobile preview (440px viewport): long-press the grip handle on a Shared Plan and on a Group, drag, release — order persists after reload.

## Out of scope

- No visual redesign of the rows.
- No backend or data-model changes.
- No changes to tap/expand behavior beyond what's needed to coexist with the drag handle.
