import { View } from "react-native";
import { Redirect } from "expo-router";

// Commute Mode requires a dev build (native @react-native-voice/voice module).
// Full implementation lives in _impl.tsx — restore this file when ready.
export default function CommuteModeStub() {
  return <Redirect href="/(tabs)/groups" />;
}
