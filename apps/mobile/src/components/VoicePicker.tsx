import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Check, Play, Square } from "lucide-react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { useTts } from "@/lib/useTts";
import { TTS_VOICES, type VoiceId } from "@/lib/voice";

// Short, evocative sample so a voice can be judged in one tap. Cached server-side
// per (text, voice), so re-auditioning the same voice is free after the first.
const SAMPLE_TEXT = "Be still, and know that I am God. Let's begin today's reading together.";
const SAMPLE_INSTRUCTIONS =
  "Read slowly, calmly and warmly — like a pastor gently guiding a quiet, reflective devotional.";

export function VoicePicker({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: VoiceId;
  onSelect: (v: VoiceId) => void;
  onClose: () => void;
}) {
  const primary = useThemeColor("primary");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");

  const tts = useTts();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const active = previewing && (tts.status === "playing" || tts.status === "preparing") ? previewing : null;

  const stopPreview = () => {
    tts.stop();
    setPreviewing(null);
  };

  const preview = (id: VoiceId) => {
    if (active === id) {
      stopPreview();
      return;
    }
    setPreviewing(id);
    tts.speak(SAMPLE_TEXT, {
      voice: id,
      instructions: SAMPLE_INSTRUCTIONS,
      onDone: () => setPreviewing((p) => (p === id ? null : p)),
    });
  };

  const close = () => {
    stopPreview();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={close} contentStyle={{ padding: 20, paddingBottom: 32, maxHeight: "88%" }}>
      <Text style={{ color: fg, fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 }}>Choose a voice</Text>
      <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, marginTop: 4, marginBottom: 16 }}>
        Tap ▶ to hear a sample, then tap a name to use it.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
        {TTS_VOICES.map((v) => {
          const isSel = v.id === selected;
          const isActive = active === v.id;
          const isPreparing = isActive && tts.status === "preparing";
          return (
            <Pressable
              key={v.id}
              onPress={() => onSelect(v.id)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${v.label} voice`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 11,
                paddingHorizontal: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderRadius: 14,
                borderColor: isSel ? primary : border,
                backgroundColor: isSel ? withAlpha(primary, 0.08) : card,
              }}
            >
              <Pressable
                onPress={() => preview(v.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={isActive ? `Stop ${v.label} sample` : `Play ${v.label} sample`}
                style={{
                  height: 38,
                  width: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: primary,
                }}
              >
                {isPreparing ? (
                  <ActivityIndicator size="small" color={primary} />
                ) : isActive ? (
                  <Square size={13} color={primary} fill={primary} />
                ) : (
                  <Play size={15} color={primary} fill={primary} />
                )}
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{v.label}</Text>
                <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 13 }}>{v.blurb}</Text>
              </View>

              {isSel ? <Check size={20} color={primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ marginTop: 12 }}>
        <Button title="Done" onPress={close} />
      </View>
    </BottomSheet>
  );
}
