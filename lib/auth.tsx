// Auth context — email + passcode, persisted via server-issued session tokens.
// The device stores ONLY an opaque random token (SecureStore). It is exchanged
// for the signed-in user on cold start; the raw userId is never used as a
// credential.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

const SESSION_TOKEN_KEY = 'clover_session_token';
// Key written by builds before the Clover rebrand. Read once for migration,
// then removed — existing users keep their session across the rename.
const LEGACY_SESSION_TOKEN_KEY = 'cove_session_token';

// expo-secure-store has no web implementation (its web entry is a stub), so
// persist via localStorage there. Native keeps the Keychain-backed store.
const tokenStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

type AuthState = {
  userId: Id<'users'> | null;
  isLoading: boolean;
  signup: (args: {
    email: string;
    name: string;
    institution: string;
    department: string;
    level: number;
    passcode: string;
  }) => Promise<void>;
  login: (email: string, passcode: string) => Promise<void>;
  logout: () => Promise<void>;
  changePasscode: (currentPasscode: string, newPasscode: string) => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  userId: null,
  isLoading: true,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  changePasscode: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signupMutation = useMutation(api.users.signup);
  const loginMutation = useMutation(api.users.login);
  const revokeMutation = useMutation(api.authSessions.revokeSession);
  const changePasscodeMutation = useMutation(api.users.changePasscode);

  // Restore the session on mount: token -> user via the server.
  // Migrates the pre-rebrand storage key in place so nobody is logged out.
  useEffect(() => {
    (async () => {
      try {
        let stored = await tokenStorage.getItem(SESSION_TOKEN_KEY);
        if (!stored) {
          stored = await tokenStorage.getItem(LEGACY_SESSION_TOKEN_KEY);
          if (stored) {
            await tokenStorage.setItem(SESSION_TOKEN_KEY, stored);
            await tokenStorage.deleteItem(LEGACY_SESSION_TOKEN_KEY);
          }
        }
        if (stored) setSessionToken(stored);
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  // Resolve the stored token to a user (reactive; revalidates if revoked).
  const session = useQuery(
    api.authSessions.validateSession,
    sessionToken ? { token: sessionToken } : 'skip'
  );
  const userId = session?.user._id ?? null;

  const persistSession = useCallback(
    async (result: { token: string; expiresAt: number }) => {
      await tokenStorage.setItem(SESSION_TOKEN_KEY, result.token);
      setSessionToken(result.token);
    },
    []
  );

  const signup = useCallback(
    async (args: {
      email: string;
      name: string;
      institution: string;
      department: string;
      level: number;
      passcode: string;
    }) => {
      const result = await signupMutation(args);
      await persistSession(result);
    },
    [signupMutation, persistSession]
  );

  const login = useCallback(
    async (email: string, passcode: string) => {
      const result = await loginMutation({ email, passcode });
      await persistSession(result);
    },
    [loginMutation, persistSession]
  );

  const logout = useCallback(async () => {
    if (sessionToken) {
      try {
        await revokeMutation({ token: sessionToken });
      } catch {}
    }
    await tokenStorage.deleteItem(SESSION_TOKEN_KEY);
    setSessionToken(null);
  }, [sessionToken, revokeMutation]);

  const changePasscode = useCallback(
    async (currentPasscode: string, newPasscode: string) => {
      if (!userId) throw new Error('Not signed in.');
      await changePasscodeMutation({
        id: userId,
        currentPasscode,
        newPasscode,
        sessionToken: sessionToken ?? undefined,
      });
    },
    [userId, sessionToken, changePasscodeMutation]
  );

  return (
    <AuthContext.Provider
      value={{ userId, isLoading, signup, login, logout, changePasscode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
