import { type ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
  /** Small uppercase line above the title (the section's "eyebrow"). */
  eyebrow?: string;
  title: string;
  /** Optional element pinned to the top-right (e.g. an overflow ⋮ menu). */
  right?: ReactNode;
};

/**
 * The standard page header for main nav screens — a small uppercase eyebrow over
 * a serif title — so Devotionals / Groups / Plans share one layout and type
 * scale. (Home and Profile use bespoke hero headers but the same serif title.)
 */
export function ScreenHeader({ eyebrow, title, right }: Props) {
  return (
    <View className="mb-6 flex-row items-start justify-between">
      <View className="flex-1">
        {eyebrow ? (
          <Text className="text-sm uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </Text>
        ) : null}
        <Text className="font-serif text-3xl font-bold text-foreground">{title}</Text>
      </View>
      {right ? <View className="pl-3">{right}</View> : null}
    </View>
  );
}
