import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown, ChevronUp, Mail, Search, X } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { HELP_SECTIONS, TOTAL_ARTICLES, type HelpSection } from "@/data/helpArticles";

const SUPPORT_EMAIL = "support@ironsharp.app";

export default function HelpCenter() {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  const filtered = useMemo<HelpSection[]>(() => {
    if (!isSearching) return HELP_SECTIONS;
    return HELP_SECTIONS.map((s) => ({
      ...s,
      articles: s.articles.filter(
        (a) => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q)
      ),
    })).filter((s) => s.articles.length > 0);
  }, [isSearching, q]);

  const matchCount = filtered.reduce((n, s) => n + s.articles.length, 0);

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Help Center" subtitle="Answers & support" />

      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 pb-12 pt-2"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View className="mb-4 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={18} color={muted} />
          <TextInput
            placeholder={`Search ${TOTAL_ARTICLES} articles…`}
            placeholderTextColor={muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            className="h-11 flex-1 font-sans text-base text-foreground"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <X size={18} color={muted} />
            </Pressable>
          ) : null}
        </View>

        {isSearching ? (
          <Text className="mb-3 text-xs text-muted-foreground">
            {matchCount} {matchCount === 1 ? "result" : "results"} for “{query}”
          </Text>
        ) : null}

        {/* Sections */}
        {filtered.length === 0 ? (
          <View className="items-center rounded-xl border border-border bg-card p-8">
            <Text className="text-center text-sm text-muted-foreground">
              No matches. Try a different search or email us below.
            </Text>
          </View>
        ) : (
          filtered.map((section) => (
            <View key={section.id} className="mb-5">
              <View
                className="mb-2 flex-row items-center gap-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: section.accentPale }}
              >
                <Text className="text-lg">{section.icon}</Text>
                <Text
                  className="font-sans-semibold text-sm uppercase tracking-wider"
                  style={{ color: section.accent }}
                >
                  {section.title}
                </Text>
              </View>

              <View className="overflow-hidden rounded-xl border border-border bg-card">
                {section.articles.map((article, i) => {
                  const key = `${section.id}:${i}`;
                  const open = openKey === key;
                  const isLast = i === section.articles.length - 1;
                  return (
                    <View key={key}>
                      <Pressable
                        onPress={() => setOpenKey(open ? null : key)}
                        className={`flex-row items-center gap-3 p-4 active:bg-muted/40 ${
                          !isLast || open ? "border-b border-border" : ""
                        }`}
                      >
                        <Text className="flex-1 font-sans-medium text-sm text-foreground">
                          {article.q}
                        </Text>
                        {open ? (
                          <ChevronUp size={16} color={muted} />
                        ) : (
                          <ChevronDown size={16} color={muted} />
                        )}
                      </Pressable>
                      {open ? (
                        <View
                          className={`px-4 pb-4 pt-2 ${!isLast ? "border-b border-border" : ""}`}
                        >
                          <Text className="text-sm leading-relaxed text-muted-foreground">
                            {article.a}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Support contact */}
        <View className="mt-2 rounded-xl border border-border bg-card p-5">
          <Text className="font-serif text-lg font-bold text-foreground">
            Still need help?
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            We read every email and usually reply within a day.
          </Text>
          <Pressable
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            className="mt-3 flex-row items-center gap-2 self-start rounded-lg bg-primary/10 px-3 py-2 active:bg-primary/20"
          >
            <Mail size={16} color={fg} />
            <Text className="font-sans-medium text-sm text-foreground">
              {SUPPORT_EMAIL}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
