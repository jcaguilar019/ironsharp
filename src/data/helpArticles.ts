export interface HelpArticle {
  q: string;
  a: string;
}

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  accent: string; // hex
  accentPale: string; // hex with alpha
  articles: HelpArticle[];
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "✦",
    accent: "#89B4C9",
    accentPale: "#89B4C922",
    articles: [
      { q: "What is IronSharp?", a: "IronSharp is a daily devotional and accountability app that helps you build a consistent time in God's Word — alone or alongside a group, discipler, or family." },
      { q: "How do I create an account?", a: "Tap Sign Up on the welcome screen and continue with Google or your email and a password. You'll verify your email, complete a short profile, and pick a starter plan." },
      { q: "Do I need to pay to use IronSharp?", a: "No. The Free tier gives you the daily devotional, your reading streak, and one active plan. Paid tiers unlock groups, discipler features, and the full plan library." },
      { q: "What's the daily flow look like?", a: "Open the app, read the day's chapter and commentary, answer two reflection questions, and (if you're in a group) compare notes with your partners." },
      { q: "Can I use IronSharp on more than one device?", a: "Yes. Sign in with the same account on any phone, tablet, or browser and your progress, plans, and notes follow you." },
      { q: "How do I switch themes?", a: "Go to Profile → Settings → Themes. You can pick from Vesper, Parchment, Sage, Dusk, or Slate at any time." },
    ],
  },
  {
    id: "devotionals",
    title: "Your Devotionals",
    icon: "📖",
    accent: "#5C4A3A",
    accentPale: "#5C4A3A22",
    articles: [
      { q: "What's in a daily devotional?", a: "Each devotional includes a Scripture passage, a short commentary, and two reflection questions designed to be answered in a few minutes." },
      { q: "How long does a devotional take?", a: "Most people finish in 8–12 minutes. Take longer if you want to sit with the text — there's no timer." },
      { q: "Can I save my answers?", a: "Yes. Your answers save automatically as you type and stay attached to that day's devotional in your history." },
      { q: "Where do I see past devotionals?", a: "Open the Devotionals tab and scroll your history, or tap a completed plan from the Plans tab to revisit each day." },
      { q: "Can I edit an answer after I submit?", a: "Yes — open the day from your history and edit. Group members will see the latest version." },
      { q: "What happens if I miss a day?", a: "Your streak resets, but your plan picks up where you left off. You can also catch up on missed days from the plan view." },
      { q: "Is there an audio version?", a: "Audio narration is on the roadmap. For now, devotionals are text-only with full theme and font controls." },
      { q: "Who writes the devotionals?", a: "They're written and reviewed by our editorial team using a consistent theological voice. See our About page for contributors." },
    ],
  },
  {
    id: "plans",
    title: "Devotional Plans",
    icon: "🗓",
    accent: "#B8A86A",
    accentPale: "#B8A86A22",
    articles: [
      { q: "What's a devotional plan?", a: "A plan is a structured series of devotionals — typically 7, 14, or 30 days — focused on a book of the Bible or a theme like prayer, identity, or anxiety." },
      { q: "How many plans can I run at once?", a: "Up to 3 active plans at a time. Finish or pause one to start a new one." },
      { q: "Where do I find new plans?", a: "Tap the Plans tab and browse the Plan Library. You can filter by length (7/14/30-day) or topic." },
      { q: "Can I reorder my active plans?", a: "Yes. On the Plans tab, drag the grip handle on a plan to reorder. On mobile, press and hold the handle for a moment before dragging." },
      { q: "What happens when I finish a plan?", a: "You'll see a completion celebration, the plan moves to your Completed list, and any year-long milestones update automatically." },
    ],
  },
  {
    id: "groups",
    title: "Groups",
    icon: "👥",
    accent: "#A89070",
    accentPale: "#A8907022",
    articles: [
      { q: "What is a group?", a: "A group is a small set of people (usually 2–6) who do the same devotional each day and compare notes. Groups are the heart of IronSharp's accountability." },
      { q: "How do I create or join a group?", a: "Tap the Groups tab → New Group to invite friends by email or shareable link, or paste an invite link to join an existing group." },
      { q: "Who can see my answers?", a: "Only members of the groups you've joined. Your answers are never public, never used for AI training, and never shown to advertisers." },
      { q: "Can I be in more than one group?", a: "Yes. You can be in multiple groups and reorder them by priority on the Groups tab." },
      { q: "How do I leave a group?", a: "Open the group, tap the settings icon, and choose Leave Group. Group owners can transfer ownership or delete the group entirely." },
    ],
  },
  {
    id: "family-youth",
    title: "Family & Youth",
    icon: "🏠",
    accent: "#7FAF8A",
    accentPale: "#7FAF8A22",
    articles: [
      { q: "What's the Family plan?", a: "The Family tier ($55/yr) covers up to 6 accounts including age-appropriate Youth profiles for kids and teens." },
      { q: "How do I add a child profile?", a: "From the Family dashboard, tap Add Child Profile and choose an age range. Their devotionals adapt to that level automatically." },
      { q: "Can parents see what kids write?", a: "Yes. The Parent Dashboard shows each child's recent answers and streaks so you can talk through them together." },
      { q: "Do youth devotionals use the same content?", a: "No. Youth devotionals are written separately with age-appropriate language, examples, and questions." },
      { q: "What ages is the Youth content for?", a: "Currently 8–12 and 13–17. Younger kids' content is on the roadmap." },
    ],
  },
  {
    id: "account",
    title: "Account & Settings",
    icon: "⚙️",
    accent: "#5C8FA8",
    accentPale: "#5C8FA822",
    articles: [
      { q: "How do I change my password?", a: "Go to Profile → Settings → Account → Change Password. If you signed in with Google, manage your password through your Google account." },
      { q: "How do I update my profile photo or name?", a: "Open Profile → tap your avatar to update the image, or use Settings → Profile to edit your name and church." },
      { q: "How do I manage notifications?", a: "Profile → Settings → Notifications lets you toggle morning reminders, accountability nudges, and group activity alerts." },
      { q: "Can I export my devotional answers?", a: "Yes. Settings → Privacy → Export My Data emails you a JSON file of every answer, plan, and group within 24 hours." },
      { q: "How do I delete my account?", a: "Settings → Delete Account. This permanently removes your profile, answers, and group memberships within 30 days." },
      { q: "Where is my data stored?", a: "On secure cloud infrastructure with encryption in transit and at rest. We never sell your data and never use it to train AI models." },
    ],
  },
  {
    id: "billing",
    title: "Subscriptions & Billing",
    icon: "💳",
    accent: "#C4937A",
    accentPale: "#C4937A22",
    articles: [
      { q: "What plans are available?", a: "Free, Connect ($18/yr), Sharpen ($40/yr), and Family ($55/yr). See the Plans page for a full feature comparison." },
      { q: "How do I upgrade or downgrade?", a: "Profile → Settings → Subscription → Change Plan. Upgrades are prorated; downgrades take effect at your next renewal." },
      { q: "How do I cancel my subscription?", a: "Settings → Subscription → Cancel. You keep access until the end of your billing period — no partial refunds." },
      { q: "Do you offer refunds?", a: "We refund within 14 days of purchase if you haven't used a paid feature. Email support@ironsharp.app to request one." },
      { q: "Can I gift IronSharp to someone?", a: "Gift subscriptions are coming soon. Email support@ironsharp.app and we'll set one up manually in the meantime." },
      { q: "Does my church get a discount?", a: "Yes — we offer church and ministry licensing for groups of 25+. Email support@ironsharp.app for a quote." },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: "🔧",
    accent: "#7A6248",
    accentPale: "#7A624822",
    articles: [
      { q: "The app won't load. What do I do?", a: "Force-quit and reopen. If it still won't load, check your internet connection, then sign out and back in. Still stuck? Email support." },
      { q: "I'm not getting notifications.", a: "Check Settings → Notifications inside IronSharp, then your device's system notification settings for IronSharp specifically." },
      { q: "My streak disappeared.", a: "Streaks reset after a missed day. If you completed your devotional and the streak still dropped, email support with the date and we'll fix it." },
      { q: "I can't drag plans to reorder on my phone.", a: "Press and hold the grip handle for about half a second before dragging — mobile uses long-press to avoid accidental drags while scrolling." },
      { q: "Google sign-in isn't working.", a: "Make sure pop-ups aren't blocked, then try again. If it keeps failing, sign in with email/password and link Google later from Settings." },
      { q: "I found a bug. How do I report it?", a: "Email support@ironsharp.app with a short description and a screenshot if you have one. We read every message." },
    ],
  },
];

export const TOTAL_ARTICLES = HELP_SECTIONS.reduce((n, s) => n + s.articles.length, 0);