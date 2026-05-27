import AppLayout from "@/components/AppLayout";
import { Heart, MessageCircle, Share2, Globe, Users, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const communityPosts = [
  {
    id: 1,
    author: "Pastor Michael",
    church: "Grace Community Church",
    avatar: "PM",
    scope: "public",
    title: "Proverbs 27 — The Weight of Friendship",
    body: "True friendship requires the courage to say hard things. Solomon isn't talking about surface-level relationships — he's describing the kind of bond where love is proven through honesty, not flattery. Who in your life loves you enough to wound you faithfully?",
    verse: "Proverbs 27:6",
    likes: 48,
    comments: 12,
    timeAgo: "2h ago",
  },
  {
    id: 2,
    author: "Men's Morning Crew",
    church: "Group Devotional",
    avatar: "MC",
    scope: "group",
    title: "Week 5 Reflection — Iron Sharpens Iron",
    body: "This week we're diving into what it truly means to sharpen one another. It's uncomfortable. It's messy. But it's how God refines us through community. Share how someone has sharpened you recently.",
    verse: "Proverbs 27:17",
    likes: 8,
    comments: 4,
    timeAgo: "5h ago",
  },
  {
    id: 3,
    author: "Sarah Thompson",
    church: "Redeemer Fellowship",
    avatar: "ST",
    scope: "public",
    title: "Better a Neighbor Nearby",
    body: "I've been thinking about proximity lately. We live in a world of distant connections, but Solomon says a neighbor nearby is better than a relative far away. God designed us for close, present community — not just digital likes.",
    verse: "Proverbs 27:10",
    likes: 31,
    comments: 7,
    timeAgo: "8h ago",
  },
  {
    id: 4,
    author: "David Kim",
    church: "Grace Community Church",
    avatar: "DK",
    scope: "public",
    title: "The Hungry Soul",
    body: "\"To the hungry even what is bitter tastes sweet.\" When you're desperate for God, even the hard truths become nourishing. Lord, keep me hungry.",
    verse: "Proverbs 27:7",
    likes: 19,
    comments: 3,
    timeAgo: "1d ago",
  },
];

const CommunityFeed = () => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<"all" | "public" | "group">("all");

  const filtered = filter === "all" ? communityPosts : communityPosts.filter(p => p.scope === filter);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate("/home")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <h1 className="mb-1 font-serif text-2xl font-bold">Community</h1>
        <p className="mb-3 text-sm text-muted-foreground">Shared devotionals & reflections</p>
        <div className="mb-5 rounded-xl border border-dashed border-border bg-card-deep px-4 py-3 text-center text-xs text-muted-foreground">
          Community feed is a preview — sharing and posting coming soon.
        </div>

        {/* Filters */}
        <div className="mb-5 flex gap-2">
          {([["all", "All"], ["public", "Public"], ["group", "My Groups"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                filter === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {key === "public" && <Globe className="h-3 w-3" />}
              {key === "group" && <Users className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {filtered.map(post => (
            <div key={post.id} className="rounded-xl border border-border bg-card p-5">
              {/* Author */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {post.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{post.author}</p>
                    <p className="text-xs text-muted-foreground">{post.church}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
              </div>

              {/* Content */}
              <h3 className="mb-2 font-serif text-base font-bold">{post.title}</h3>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{post.body}</p>
              <p className="mb-4 text-xs font-medium text-primary italic">— {post.verse}</p>

              {/* Actions */}
              <div className="flex items-center gap-4 border-t border-border pt-3">
                <button
                  onClick={() => setLiked(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    liked[post.id] ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${liked[post.id] ? "fill-primary" : ""}`} />
                  <span>{post.likes + (liked[post.id] ? 1 : 0)}</span>
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CommunityFeed;