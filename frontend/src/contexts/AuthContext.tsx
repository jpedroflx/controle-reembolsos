import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { setAuthToken } from "../api/http";

export type UserRole = "COLABORADOR" | "GESTOR" | "FINANCEIRO" | "ADMIN";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  clearSession: () => void;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  token: string | null;
  user: AuthUser | null;
  userRole: UserRole | null;
};

const STORAGE_KEY = "controle-reembolsos:session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isUserRole(value: unknown): value is UserRole {
  return value === "COLABORADOR" || value === "GESTOR" || value === "FINANCEIRO" || value === "ADMIN";
}

function normalizeSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = value as {
    token?: unknown;
    user?: {
      id?: unknown;
      name?: unknown;
      nome?: unknown;
      email?: unknown;
      role?: unknown;
      perfil?: unknown;
    };
  };

  const userRole = session.user?.role ?? session.user?.perfil;
  const userName = session.user?.name ?? session.user?.nome;

  if (
    typeof session.token !== "string" ||
    !session.user ||
    typeof session.user.id !== "string" ||
    typeof userName !== "string" ||
    typeof session.user.email !== "string" ||
    !isUserRole(userRole)
  ) {
    return null;
  }

  return {
    token: session.token,
    user: {
      id: session.user.id,
      name: userName,
      email: session.user.email,
      role: userRole
    }
  };
}

function readStoredSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const session = normalizeSession(JSON.parse(rawSession));

    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    return session;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setStoredSession] = useState<AuthSession | null>(() => readStoredSession());

  useEffect(() => {
    setAuthToken(session?.token ?? null);
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
      user: session?.user ?? null,
      userRole: session?.user.role ?? null
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
