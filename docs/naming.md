# IronSharp product vocabulary

The single source of truth for user-facing nouns. There are **two axes**: what you
read (content) and who/how you read it (audience & format). Don't mix them.

## Content — what you read
- **Devotional** — the content of a single day: the passage, context, study notes,
  and the Reflect/Act questions. e.g. "today's devotional."
- **Plan** — a multi-day series of devotionals (7 / 14 / 21 days) on a book or theme.
  A plan is just "multiple days" of devotionals.

## Audience & format — who you do it with, and how
- **Personal** — solo. Your personal devotional lives on the **Home** tab.
- **Group** — multiple people doing the same plan together; the group advances as
  members complete each day.
- **Discipleship** — a one-on-one *format* (backed by a one-on-one group) where the
  discipler can read the disciple's answers, flag/save notes, send a daily question,
  and message privately.
- **Community** — **everyone, app-wide.** You don't choose a group; it's the whole app
  reading the same devotional. The Community feed is a **public forum** — anything you
  post there is visible to every user.

> Rule of thumb: you always read a **devotional** (inside a **plan**). What changes is
> the **audience/format** — personal, group, discipleship, or community.

## The two response questions
- **Reflect** — the first response question (`reflectionQ1`).
- **Act** — the second response question (`reflectionQ2`).
- Use **Reflect** / **Act** everywhere. Never "Reflection 1 / 2."
- The response area in the reader is titled **"Your Response."**

## Tabs (route → label)
| Route | Label | Job |
|---|---|---|
| `home` | Home | Your personal devotional today + dashboard |
| `plans` | Plans | Browse and start plans (the content library) |
| `groups` | Groups | Your groups and discipleship |
| `community` | Community | The app-wide (everyone) devotional + public forum |
| `profile` | Profile | Settings |

Internal identifiers (route names like `groups`/`guided`, DB columns like
`reflectionQ1`, the `community` group-type key) are intentionally *not* renamed — only
user-facing strings follow this glossary.

## Other terms
- **Commute Mode** — the hands-free, read-aloud + voice-response mode (internally the
  `guided/` route). Always "Commute Mode" to users.
- Group types (user-facing labels): One-on-One, Family, Small Group, Large Group,
  Church. (The "Church" group type is distinct from the Community tab.)
