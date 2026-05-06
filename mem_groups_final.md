---
name: Simplified Groups Screen
description: Unified Groups screen replacing separate Family/Group tabs — one-on-one (#A89070), family (#7FAF8A), small-group (#B8A86A) with collapsed/expanded card pattern
type: feature
---
## Unified Groups Screen (May 2026)

Replaces separate Family tab + Group tab with single Groups tab in bottom nav.

### Group Types (color-coded accent bar only, no labels/badges):
- One-on-One: #A89070 (warm tan) — 2 people, accountability/discipler pairs
- Family: #7FAF8A (sage green) — parent + child profiles, parental controls
- Small Group: #B8A86A (soft gold) — 3-10 people, leader has controls

### Card — Default (collapsed):
- 3px accent bar top
- Group name (bold serif) + streak (flame + number, top right)
- Subtitle: Type · Chapter · Day X/Y
- 2px progress bar
- Member avatars (accent fill if done, grey if pending) + X/Y done today
- Two buttons: Open Devotional (flex 3, accent bg) + expand toggle (flex 1)

### Card — Expanded:
- Full member list: avatar + name + role + ✓/–
- Two buttons: Invite · Settings
- No tool chips, no badges

### Database:
- Single 'groups' table with group_type enum: one-on-one, family, small-group
- group_members table with role field
- Family groups link to family_plan_id
