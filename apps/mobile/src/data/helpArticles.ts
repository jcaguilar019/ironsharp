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
      {
        q: "What is IronSharp?",
        a: "IronSharp is a daily devotional and accountability app built to help you spend real time in God's Word — alone, with a spouse or friend, or alongside a small group. Each devotional is short enough to actually finish and honest enough to matter.",
      },
      {
        q: "How do I create an account?",
        a: "Tap Sign Up on the welcome screen and continue with your email and a password. You'll verify your email, fill out a short profile, and be ready to start.",
      },
      {
        q: "Do I need to pay to use IronSharp?",
        a: "No. The Free tier lets you browse the full plan library, unlock up to 3 plans per month, and do your daily devotional. Paid tiers unlock larger groups, AI-generated plans, and more.",
      },
      {
        q: "What does a daily devotional look like?",
        a: "You read the specific Bible passage for that day, answer two reflection questions — one that looks inward at your heart, one that calls you toward a specific action — then write freely in the Prayer & Praise section. Most people finish in 10–15 minutes.",
      },
      {
        q: "Can I use IronSharp on more than one device?",
        a: "Yes. Sign in with the same account on any device and your progress, plans, and answers follow you.",
      },
      {
        q: "How do I switch themes?",
        a: "Go to Profile → Appearance. You can pick from Vesper, Parchment, Sage, Dusk, or Slate at any time.",
      },
    ],
  },
  {
    id: "devotionals",
    title: "Your Devotionals",
    icon: "📖",
    accent: "#5C4A3A",
    accentPale: "#5C4A3A22",
    articles: [
      {
        q: "What's inside a daily devotional?",
        a: "Each day shows the exact Bible verses referenced — not the whole chapter — so you're focused on the specific passage. Then two reflection questions and an open Prayer & Praise field where you write whatever you want to bring to God.",
      },
      {
        q: "How long does a devotional take?",
        a: "Most people finish in 10–15 minutes. There's no timer and no pressure — sit longer if you need to.",
      },
      {
        q: "What are the two reflection questions?",
        a: "The first points inward — it asks about your heart, motives, or a tension the passage exposes. The second points outward — a specific action or decision you can act on today. Neither one has a comfortable generic answer.",
      },
      {
        q: "What is the Prayer & Praise section for?",
        a: "It's an open text field. No script, no prompt telling you what to say — just space to bring whatever you have to God. Confession, gratitude, a request, or nothing but silence. It's yours.",
      },
      {
        q: "Are my answers saved?",
        a: "Yes. Your answers save automatically as you type and stay attached to that day's devotional.",
      },
      {
        q: "Where can I see past devotionals?",
        a: "Open the Devotional tab — your active personal plan is at the top under Personal, and any group plans you're in show under Shared. Completed plans are visible from the Plans tab.",
      },
      {
        q: "What happens if I miss a day?",
        a: "Your streak resets, but your plan picks up exactly where you left off. No content is skipped or locked.",
      },
      {
        q: "Is there a read-aloud or audio option?",
        a: "Yes — it's called Commute Mode. It reads the passage and reflection questions aloud, then lets you respond out loud, hands-free. Open any devotional, tap the play button, and choose Commute Mode.",
      },
    ],
  },
  {
    id: "plans",
    title: "Devotional Plans",
    icon: "🗓",
    accent: "#B8A86A",
    accentPale: "#B8A86A22",
    articles: [
      {
        q: "What's a devotional plan?",
        a: "A plan is a structured series of devotionals — 7, 14, or 21 days — focused on a book of the Bible or a specific theme. Each day builds on the last.",
      },
      {
        q: "How many personal plans can I run at once?",
        a: "One. IronSharp is built for depth, not breadth — finish what's in front of you before starting something new. Group plans are tracked separately and don't count against this limit.",
      },
      {
        q: "What's the difference between a personal plan and a group plan?",
        a: "A personal plan is yours alone. A group plan is the same plan shared with a group — each member reads the same day and the group advances together. You can even do a plan both personally and in a group at the same time; your progress tracks separately for each.",
      },
      {
        q: "How do I start a plan?",
        a: "Go to the Plans tab, browse by category, and tap a plan. You'll be asked if it's just for you or for a group. If you have groups, you can assign it to one of them.",
      },
      {
        q: "Where do I find new plans?",
        a: "Tap the Plans tab and browse the categories — Men's, Women's, Marriage, Family, General, and more. AI-generated plans tailored to your specific book or topic are also coming soon.",
      },
      {
        q: "What happens when I finish a plan?",
        a: "You'll see a completion screen, the plan moves to your Completed list, and your total completed count updates on your profile.",
      },
    ],
  },
  {
    id: "groups",
    title: "Groups",
    icon: "👥",
    accent: "#A89070",
    accentPale: "#A8907022",
    articles: [
      {
        q: "What is a group?",
        a: "A group is a small set of people reading the same devotional together. Each member does their day independently, and the group advances to the next day once everyone has completed it. Groups are where IronSharp's accountability actually happens.",
      },
      {
        q: "How do I create a group?",
        a: "Open the Groups tab and tap the + button. Name your group, choose a type (one-on-one, family, small group, etc.), and share the invite code with whoever you want to add.",
      },
      {
        q: "How does someone join my group?",
        a: "Share your group's invite code with them. They enter it in the Groups tab under Join Group. That's it.",
      },
      {
        q: "How does group day progression work?",
        a: "Every member needs to complete their devotional before the group moves to the next day. Once the last person submits, the group advances together. This keeps everyone accountable — no one gets left behind.",
      },
      {
        q: "Where do I open my group's devotional?",
        a: "Two places: the Devotional tab → Shared section shows all your group plans with a Continue Reading button, or tap the group card in the Groups tab and use the Open Devotional button.",
      },
      {
        q: "Can I assign a plan to my group?",
        a: "Yes. When you tap a plan in the Plans tab, choose the group you want to read it with. If the group already has that plan assigned, it opens right to your current day without resetting progress.",
      },
      {
        q: "Who can see my answers?",
        a: "Only members of the group you submitted them in. Your answers are never public and never used for AI training.",
      },
      {
        q: "How do I leave a group?",
        a: "Open the group settings and choose Leave Group. If you created the group, you can also delete it entirely.",
      },
    ],
  },
  {
    id: "family",
    title: "Family Plan",
    icon: "🏠",
    accent: "#7FAF8A",
    accentPale: "#7FAF8A22",
    articles: [
      {
        q: "What's included in the Family plan?",
        a: "The Family plan ($9.99/mo or $96/yr) covers 4 accounts — 2 parent accounts and 2 child accounts — each with everything in the Sharpen tier. Additional child accounts are $1.99/mo or $20/yr each.",
      },
      {
        q: "What are child accounts?",
        a: "Child accounts have the same devotional experience as adult accounts but with a few restrictions by default: no AI-generated plans and limited access to outside groups. A high school flag on the account lifts those restrictions.",
      },
      {
        q: "Are there youth-specific devotionals?",
        a: "Age-appropriate devotional content and a parent dashboard are on the roadmap. Right now all accounts share the same plan library.",
      },
      {
        q: "Can child accounts join groups?",
        a: "Child accounts can be added to family groups. Joining outside groups with a church leader's approval is a future feature tied to church roles.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Settings",
    icon: "⚙️",
    accent: "#5C8FA8",
    accentPale: "#5C8FA822",
    articles: [
      {
        q: "How do I update my name or profile?",
        a: "Open Profile → Edit Profile to update your display name and church information.",
      },
      {
        q: "How do I change my password?",
        a: "Go to Profile → Edit Profile → Change Password.",
      },
      {
        q: "How do I delete my account?",
        a: "Settings → Delete Account. This permanently removes your profile, answers, and group memberships. Email support@ironsharp.app if you run into any issues.",
      },
      {
        q: "Where is my data stored?",
        a: "On secure cloud infrastructure with encryption in transit and at rest. We never sell your data and never use it to train AI models.",
      },
    ],
  },
  {
    id: "billing",
    title: "Subscriptions & Billing",
    icon: "💳",
    accent: "#C4937A",
    accentPale: "#C4937A22",
    articles: [
      {
        q: "What plans are available?",
        a: "Free, Connect ($2.99/mo or $25/yr), Sharpen ($4.99/mo or $48/yr), and Family ($9.99/mo or $96/yr). See the Plans page for a full feature comparison.",
      },
      {
        q: "What does Connect include?",
        a: "Unlock up to 5 plans/month, 1 AI-generated plan token per month, and groups of up to 5 people.",
      },
      {
        q: "What does Sharpen include?",
        a: "Unlimited plan unlocks, 2 AI-generated plan tokens per month, and unlimited groups of any size.",
      },
      {
        q: "How do I upgrade or downgrade?",
        a: "Profile → Membership → Change Plan. Upgrades take effect immediately; downgrades take effect at your next renewal.",
      },
      {
        q: "How do I cancel?",
        a: "Profile → Membership → Cancel. You keep access until the end of your billing period.",
      },
      {
        q: "Do you offer refunds?",
        a: "We refund within 14 days of purchase if you haven't used a paid feature. Email support@ironsharp.app to request one.",
      },
      {
        q: "Does my church get a discount?",
        a: "Yes — we offer ministry licensing for groups of 25 or more. Email support@ironsharp.app for a quote.",
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: "🔧",
    accent: "#7A6248",
    accentPale: "#7A624822",
    articles: [
      {
        q: "The app won't load. What do I do?",
        a: "Force-quit and reopen. If it still won't load, check your internet connection, then sign out and back in. Still stuck? Email support@ironsharp.app.",
      },
      {
        q: "My group isn't advancing to the next day.",
        a: "Every member needs to submit their devotional before the group moves forward. Check the group card — it shows a checkmark next to each member who has completed the day.",
      },
      {
        q: "I assigned a plan to my group but it still shows as personal.",
        a: "Open the devotional from the Groups tab or the Shared section of the Devotional tab — those routes open it in group context. Opening from the Home screen will show your personal progress for that plan.",
      },
      {
        q: "My streak disappeared.",
        a: "Streaks reset after a missed day. If you completed your devotional and the streak still dropped, email support@ironsharp.app with the date and we'll fix it.",
      },
      {
        q: "I found a bug. How do I report it?",
        a: "Email support@ironsharp.app with a short description and a screenshot if you have one. We read every message.",
      },
    ],
  },
];

export const TOTAL_ARTICLES = HELP_SECTIONS.reduce((n, s) => n + s.articles.length, 0);
