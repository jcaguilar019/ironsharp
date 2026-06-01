import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Shield, Heart, Handshake, type LucideIcon } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { useOnboarding, type OnboardingRole } from "./_layout";

const ROLES: { id: OnboardingRole; title: string; desc: string; icon: LucideIcon }[] = [
  {
    id: "discipler",
    title: "Discipler",
    desc: "Lead and model consistency for someone you're mentoring",
    icon: Shield,
  },
  {
    id: "disciple",
    title: "Disciple",
    desc: "Follow along and grow with your mentor's guidance",
    icon: Heart,
  },
  {
    id: "partner",
    title: "Accountability Partner",
    desc: "Walk alongside a peer — equal standing, mutual encouragement",
    icon: Handshake,
  },
];

export default function RoleSelect() {
  const router = useRouter();
  const { role, set } = useOnboarding();
  const selectedIcon = useThemeColor("primary-foreground");
  const mutedIcon = useThemeColor("muted-foreground");

  return (
    <Screen center className="px-8">
      <Text className="font-serif text-3xl font-bold text-foreground">Your Role</Text>
      <Text className="mb-8 mt-2 text-sm text-muted-foreground">
        How will you show up for your group?
      </Text>

      <View className="w-full max-w-sm gap-3">
        {ROLES.map(({ id, title, desc, icon: Icon }) => {
          const active = role === id;
          return (
            <Pressable
              key={id}
              onPress={() => set({ role: id })}
              className={`flex-row items-start gap-4 rounded-xl border-2 p-4 ${
                active ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <View
                className={`h-10 w-10 items-center justify-center rounded-lg ${
                  active ? "bg-primary" : "bg-muted"
                }`}
              >
                <Icon size={20} color={active ? selectedIcon : mutedIcon} />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-base text-foreground">{title}</Text>
                <Text className="mt-0.5 text-sm text-muted-foreground">{desc}</Text>
              </View>
            </Pressable>
          );
        })}

        <Button
          title="Continue"
          disabled={!role}
          onPress={() => router.push("/onboarding/plan")}
        />
      </View>
    </Screen>
  );
}
