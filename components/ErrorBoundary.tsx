// ErrorBoundary — catches unhandled JS errors and shows a recovery screen.
// Wraps the entire app in _layout.tsx.
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/lib/theme';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

// Class component because error boundaries must use lifecycle methods.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, send to crash reporting service (Sentry, Bugsnag, etc.)
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Themed fallback — functional component so it can use useTheme.
function ErrorFallback({ onRetry, error }: { onRetry: () => void; error: Error | null }) {
  // Inline theme access since this is outside the normal component tree
  // but still inside ThemeProvider.
  return <ErrorFallbackInner onRetry={onRetry} error={error} />;
}

function ErrorFallbackInner({ onRetry, error }: { onRetry: () => void; error: Error | null }) {
  const t = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <Text style={[styles.title, { color: t.colors.ink }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: t.colors.inkSecondary }]}>
        The app ran into an unexpected error. You can try again or restart the app.
      </Text>
      {error && (
        <Text style={[styles.errorDetail, { color: t.colors.neutral500 }]}>
          {error.message}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: t.colors.fill }]}
        onPress={onRetry}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={[styles.retryText, { color: t.colors.fillInk }]}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  errorDetail: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
