import { isAxiosError } from "axios";

type ApiErrorBody = {
  message?: string;
  statusCode?: number;
  error?: string;
};

const friendlyMessages: Record<string, string> = {
  "Attachments can only be added to draft reimbursement requests":
    "Anexos so podem ser adicionados em solicitacoes em rascunho.",
  "Category name is already in use": "Ja existe uma categoria com esse nome.",
  "Category not found": "Categoria nao encontrada.",
  "Category not found or inactive": "Categoria nao encontrada ou inativa.",
  "Expense date cannot be in the future": "A data da despesa nao pode ser futura.",
  "Invalid email or password": "Email ou senha invalidos.",
  "Invalid reimbursement status transition": "Esta acao nao e permitida para o status atual.",
  "Only draft reimbursement requests can be edited": "Apenas solicitacoes em rascunho podem ser editadas.",
  "Reimbursement request not found": "Solicitacao nao encontrada.",
  "User does not have permission to access this resource": "Voce nao tem permissao para acessar este recurso.",
  "Validation error": "Confira os campos informados."
};

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return fallbackMessage;
  }

  const message = error.response?.data?.message;

  if (typeof message === "string" && message.trim()) {
    return friendlyMessages[message] ?? message;
  }

  return fallbackMessage;
}

export function getApiErrorStatus(error: unknown) {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return undefined;
  }

  return error.response?.status;
}
