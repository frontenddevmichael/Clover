// useAppState — track app foreground/background transitions.
// Returns the current AppState and provides a callback for foreground resume.
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppState(onForeground?: () => void) {
  const appState = useRef(AppState.currentState);
  const [state, setState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        onForeground?.();
      }
      appState.current = nextState;
      setState(nextState);
    });

    return () => subscription.remove();
  }, [onForeground]);

  return state;
}
