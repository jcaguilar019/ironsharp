import { forwardRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useThemeColor } from "@/components/useThemeColor";

type Props = TextInputProps & {
  label?: string;
  hint?: string;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, hint, ...rest },
  ref
) {
  const placeholderColor = useThemeColor("muted-foreground");
  return (
    <View>
      {label ? (
        <Text className="mb-1 font-sans-medium text-sm text-foreground">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderColor}
        className="h-12 rounded-xl border border-input bg-card px-4 font-sans text-base text-foreground"
        {...rest}
      />
      {hint ? <Text className="mt-1 text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
  );
});
