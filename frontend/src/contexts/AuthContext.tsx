import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { api } from "../api/http";

type UserProfile = "COLABORADOR" | "GESTOR" | "FINANCEIRO" | "ADMIN";

type AuthUser = {
  id: string;
  nome: string;
  email: string;
  perfil: UserProfile;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  clearSession: () => void;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  token: string | null;
  user: AuthUser | null;
};

const STORAGE_KEY = "controle-reembolsos:session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setStoredSession] = useState<AuthSession | null>(() => readStoredSession());

  useEffect(() => {
    if (session?.token) {
      api.defaults.headers.common.Authorization = `Bearer ${session.token}`;
      return;
    }

    delete api.defaults.headers.common.Authorization;
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      clearSession: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setStoredSession(null);
      },
      isAuthenticated: Boolean(session?.token),
      setSession: (nextSession) => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setStoredSession(nextSession);
      },
      token: session?.token ?? null,
      user: session?.user ?? null
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
