import { isAxiosError } from "axios";

type ApiErrorBody = {
  message?: string;
  statusCode?: number;
  error?: string;
};

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return fallbackMessage;
  }

  const message = error.response?.data?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallbackMessage;
}

export function getApiErrorStatus(error: unknown) {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return undefined;
  }

  return error.response?.status;
}
