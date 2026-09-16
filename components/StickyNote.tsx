// StickyNote — hand-drawn sticky note card for schedule sessions
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

type StickyNoteProps = {
  children: React.ReactNode;
  color?: string;
  accentColor?: string;
  style?: any;
  index?: number;
};

export function StickyNote({ children, color, accentColor, style, index = 0 }: StickyNoteProps) {
  const t = useTheme();
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const bgColor = color || t.colors.surface;
  const borderColor = accentColor || t.colors.hairline;

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          backgroundColor: bgColor,
          borderLeftColor: borderColor,
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Folded corner */}
      <View style={styles.foldCorner}>
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Path
            d="M0 0 L20 0 L0 20 Z"
            fill={accentColor ? `${accentColor}22` : t.colors.subtleFill}
          />
        </Svg>
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  foldCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
