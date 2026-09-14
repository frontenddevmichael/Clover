// Shared button component — ui-prompt.md §7
// Primary = solid fill (inverts per scheme), 12px radius
// Secondary = outline only
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/lib/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  style?: object;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const t = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        {
          minHeight: 48,
          minWidth: 48,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: t.spacing[5],
          paddingVertical: t.spacing[3],
          borderRadius: t.radii.chip,
        },
        isPrimary
          ? { backgroundColor: t.colors.fill }
          : { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.colors.hairline },
        disabled && { opacity: 0.4 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? t.colors.fillInk : t.colors.ink} size="small" />
      ) : (
        <Text
          style={[
            {
              fontSize: t.typography.body,
              fontWeight: t.typography.semibold,
            },
            isPrimary
              ? { color: t.colors.fillInk }
              : { color: t.colors.ink },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
