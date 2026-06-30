import { View } from "react-native";
import { Hammer } from "lucide-react-native";

/**
 * The "tokens" shown on the Create Your Own card — one hammer coin per AI
 * generation the user's tier allows that month, filled for the ones still
 * available. Renders nothing for tiers with no AI tokens (limit 0).
 */
export function TokenCoins({ count, limit }: { count: number; limit: number }) {
  if (limit === 0) return null;
  return (
    <View style={{ flexDirection: "row", gap: 5, marginTop: 6 }}>
      {Array.from({ length: limit }, (_, i) => {
        const active = i < count;
        return (
          <View
            key={i}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.18)",
              borderWidth: active ? 0 : 1,
              borderColor: "rgba(255,255,255,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {active && <Hammer size={11} color="#3B2A1A" />}
          </View>
        );
      })}
    </View>
  );
}
