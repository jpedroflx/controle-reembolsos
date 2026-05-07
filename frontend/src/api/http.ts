import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

type AuthSessionPayload = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "COLABORADOR" | "GESTOR" | "FINANCEIRO" | "ADMIN";
  };
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3333",
  withCredentials: true
});

let refreshPromise: Promise<AuthSessionPayload> | null = null;
let onSessionRefreshed: ((session: AuthSessionPayload) => void) | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

export function setAuthCallbacks(callbacks: {
  onSessionRefreshed?: (session: AuthSessionPayload) => void;
  onUnauthorized?: () => void;
}) {
  onSessionRefreshed = callbacks.onSessionRefreshed ?? null;
  onUnauthorized = callbacks.onUnauthorized ?? null;
}

function isAuthEndpoint(url: string | undefined) {
  return url === "/auth/login" || url === "/auth/refresh" || url === "/auth/logout";
}

async function requestSessionRefresh() {
  if (!refreshPromise) {
    refreshPromise = api
      .post<AuthSessionPayload>("/auth/refresh")
      .then((response) => response.data)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshedSession = await requestSessionRefresh();
      setAuthToken(refreshedSession.token);
      onSessionRefreshed?.(refreshedSession);
      originalRequest.headers.Authorization = `Bearer ${refreshedSession.token}`;

      return api(originalRequest);
    } catch (refreshError) {
      setAuthToken(null);
      onUnauthorized?.();

      return Promise.reject(refreshError);
    }
  }
);
