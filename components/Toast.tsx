// Toast — lightweight non-blocking feedback (replaces Alert.alert for success).
// Shows at the top, auto-dismisses after 2 seconds.
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/lib/theme';

type ToastType = 'success' | 'error' | 'info';

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_DURATION = 2500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'info' });
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ visible: true, message, type });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    timeoutRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      });
    }, TOAST_DURATION);
  }, [opacity]);

  const success = useCallback((msg: string) => show(msg, 'success'), [show]);
  const error = useCallback((msg: string) => show(msg, 'error'), [show]);
  const info = useCallback((msg: string) => show(msg, 'info'), [show]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const bgColor = toast.type === 'success'
    ? t.colors.successBg
    : toast.type === 'error'
    ? t.colors.workloadOverloadedBg
    : t.colors.fill;

  const textColor = toast.type === 'info' ? t.colors.ink : t.colors.fillInk;

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      {toast.visible && (
        <Animated.View style={[styles.container, { opacity, backgroundColor: bgColor }]}>
          <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    maxWidth: width - 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
