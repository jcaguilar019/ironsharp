import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";

/**
 * PHASE 0 smoke test — validates the three speech/audio native modules on a
 * real device before we build the actual guided-devotional feature on top.
 * TEMPORARY: remove (and its Profile entry) before merging to production.
 */
export default function SpeechTest() {
  const [ttsStatus, setTtsStatus] = useState("idle");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sttError, setSttError] = useState<string | null>(null);
  const [recUri, setRecUri] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState("idle");

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(recUri ?? undefined);

  useSpeechRecognitionEvent("result", (e) => {
    setTranscript(e.results?.[0]?.transcript ?? "");
  });
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", (e) => {
    setSttError(`${e.error}: ${e.message}`);
    setListening(false);
  });

  const speak = () => {
    setTtsStatus("speaking");
    Speech.speak(
      "As iron sharpens iron, so one person sharpens another. Take a moment — what is God showing you today?",
      {
        rate: 0.95,
        onDone: () => setTtsStatus("done"),
        onStopped: () => setTtsStatus("stopped"),
        onError: () => setTtsStatus("error"),
      }
    );
  };

  const toggleListen = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    setSttError(null);
    setTranscript("");
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setSttError("Microphone/speech permission denied");
      return;
    }
    setListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
    });
  };

  const record = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setAudioStatus("permission denied");
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    setAudioStatus("recording…");
    await recorder.prepareToRecordAsync();
    recorder.record();
    setTimeout(async () => {
      await recorder.stop();
      setRecUri(recorder.uri ?? null);
      setAudioStatus("recorded");
    }, 3000);
  };

  const play = () => {
    player.seekTo(0);
    player.play();
    setAudioStatus("playing");
  };

  return (
    <Screen edges={["top"]}>
      <Header title="Speech Test" subtitle="Phase 0 smoke" />
      <ScrollView contentContainerClassName="mx-auto w-full max-w-lg gap-5 px-6 py-6">
        <Card title="1 · Text-to-Speech (expo-speech)">
          <DevButton label="Speak sample" onPress={speak} />
          <Status text={`status: ${ttsStatus}`} />
        </Card>

        <Card title="2 · Speech-to-Text (expo-speech-recognition)">
          <DevButton label={listening ? "Stop listening" : "Start listening"} onPress={toggleListen} />
          <Status text={listening ? "listening…" : "idle"} />
          <Text className="text-base text-foreground">{transcript || "— (speak after granting permission)"}</Text>
          {sttError ? <Text className="text-sm text-destructive">{sttError}</Text> : null}
        </Card>

        <Card title="3 · Audio record/play (expo-audio)">
          <DevButton label="Record 3 seconds" onPress={record} />
          <DevButton label="Play recording" onPress={play} disabled={!recUri} />
          <Status text={`status: ${audioStatus}`} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-4">
      <Text className="font-sans-semibold text-base text-foreground">{title}</Text>
      {children}
    </View>
  );
}

function DevButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-11 items-center justify-center rounded-lg ${disabled ? "bg-muted" : "bg-primary"}`}
    >
      <Text className="font-sans-semibold text-base text-primary-foreground">{label}</Text>
    </Pressable>
  );
}

function Status({ text }: { text: string }) {
  return <Text className="text-sm text-muted-foreground">{text}</Text>;
}
