import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, setAuthCallbacks, setAuthToken } from "../api/http";

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
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
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
  const [session, setStoredSession] = useState<AuthSession | null>(() => {
    const storedSession = readStoredSession();
    setAuthToken(storedSession?.token ?? null);
    return storedSession;
  });

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setStoredSession(null);
  }, []);

  const setSession = useCallback((nextSession: AuthSession) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    setAuthToken(nextSession.token);
    setStoredSession(nextSession);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await api.post<AuthSession>("/auth/refresh");
      setSession(response.data);

      return true;
    } catch {
      clearSession();

      return false;
    }
  }, [clearSession, setSession]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    setAuthCallbacks({
      onSessionRefreshed: setSession,
      onUnauthorized: clearSession
    });

    return () => {
      setAuthCallbacks({});
    };
  }, [clearSession, setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      clearSession,
      isAuthenticated: Boolean(session?.token),
      logout,
      refreshSession,
      setSession,
      token: session?.token ?? null,
      user: session?.user ?? null,
      userRole: session?.user.role ?? null
    }),
    [clearSession, logout, refreshSession, session, setSession]
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
