"use client";

import {
  onAuthStateChanged,
  type Unsubscribe,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  completeRedirectSignIn,
  getKoreanAuthError,
  isAllowedUser,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import {
  getFirebaseConfigurationError,
  getFirebaseServices,
} from "@/lib/firebase/client";
import { clearSearchCache } from "@/features/logbook/search/searchDb";
import { signOutAndClearUserCache } from "@/lib/firebase/session";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  configurationError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configurationError = getFirebaseConfigurationError();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configurationError === null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (configurationError) return;

    let unsubscribe: Unsubscribe | undefined;
    let active = true;

    try {
      const { auth } = getFirebaseServices();
      void completeRedirectSignIn(auth).catch((redirectError) => {
        if (active) setError(getKoreanAuthError(redirectError));
      });

      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        if (!active) return;
        const previousUid = currentUidRef.current;
        if (previousUid && previousUid !== nextUser?.uid) {
          void clearSearchCache(previousUid).catch(() => undefined);
        }
        if (nextUser && !isAllowedUser(nextUser)) {
          currentUidRef.current = null;
          setUser(null);
          setError("이 앱에 허용되지 않은 Google 계정입니다.");
          void signOutAndClearUserCache(nextUser.uid)
            .catch(() => {
              if (active) {
                setError(
                  "허용되지 않은 계정에서 로그아웃했지만 로컬 검색 캐시를 완전히 정리하지 못했습니다. 브라우저 사이트 데이터를 삭제해주세요.",
                );
              }
            })
            .finally(() => {
              if (active) setLoading(false);
            });
          return;
        }
        currentUidRef.current = nextUser?.uid ?? null;
        setUser(nextUser);
        setLoading(false);
      });
    } catch (setupError) {
      queueMicrotask(() => {
        if (!active) return;
        setError(getKoreanAuthError(setupError));
        setLoading(false);
      });
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [configurationError]);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (signInError) {
      setError(getKoreanAuthError(signInError));
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signOutAndClearUserCache(user?.uid ?? null);
    } catch (signOutError) {
      setError(
        "로그아웃 또는 로컬 검색 캐시 정리를 완료하지 못했습니다. 다시 시도해주세요.",
      );
      throw signOutError;
    } finally {
      setBusy(false);
    }
  }, [user?.uid]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      busy,
      error,
      configurationError,
      signIn,
      signOut,
      clearError: () => setError(null),
    }),
    [user, loading, busy, error, configurationError, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
