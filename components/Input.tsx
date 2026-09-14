// Input component — text field for forms
import React from 'react';
import {
  TextInput,
  Text,
  View,
  TextInputProps,
} from 'react-native';
import { useTheme } from '@/lib/theme';

type FormInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function FormInput({ label, error, style, ...props }: FormInputProps) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.spacing[4] }}>
      <Text
        style={{
          fontSize: t.typography.secondary,
          fontWeight: t.typography.medium,
          color: t.colors.ink,
          marginBottom: t.spacing[1],
        }}
      >
        {label}
      </Text>
      <TextInput
        style={[
          {
            backgroundColor: t.colors.tier1,
            borderWidth: 1,
            borderColor: t.colors.hairline,
            borderRadius: t.radii.chip,
            paddingHorizontal: t.spacing[3],
            paddingVertical: t.spacing[3],
            fontSize: t.typography.body,
            color: t.colors.ink,
            minHeight: 48,
          },
          error && { borderColor: t.colors.workloadOverloaded },
          style,
        ]}
        placeholderTextColor={t.colors.placeholder}
        accessibilityLabel={label}
        {...props}
      />
      {error && (
        <Text
          style={{
            fontSize: t.typography.caption,
            color: t.colors.workloadOverloaded,
            marginTop: t.spacing[1],
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
