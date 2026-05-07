import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/http";
import { ReimbursementNewPage } from "../pages/ReimbursementNewPage";
import type { Category } from "../types/categories";
import { createAuthSession, renderWithProviders } from "./test-utils";

vi.mock("../api/http", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  },
  setAuthToken: vi.fn()
}));

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
};

const categories: Category[] = [
  {
    active: true,
    attachmentRequiredAboveAmount: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    id: "cat-transporte",
    maxAmount: null,
    name: "Transporte",
    updatedAt: "2026-05-01T00:00:00.000Z"
  }
];

function getTodayDateInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function makeApiError(message: string) {
  return {
    isAxiosError: true,
    response: {
      data: {
        error: "Bad Request",
        message,
        statusCode: 400
      },
      status: 400
    }
  };
}

async function fillValidReimbursementForm() {
  const user = userEvent.setup();

  await screen.findByLabelText(/descricao/i);
  await user.type(screen.getByLabelText(/descricao/i), "Taxi para cliente");
  await user.selectOptions(screen.getByLabelText(/categoria/i), "cat-transporte");
  await user.type(screen.getByLabelText(/valor/i), "120");
  await user.type(screen.getByLabelText(/data da despesa/i), getTodayDateInputValue());
  await user.click(screen.getByRole("button", { name: /criar solicitacao/i }));
}

describe("ReimbursementNewPage backend error messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: categories });
  });

  it("shows a friendly error when the API rejects a future expense date", async () => {
    mockedApi.post.mockRejectedValueOnce(makeApiError("Expense date cannot be in the future"));

    renderWithProviders(<ReimbursementNewPage />, {
      route: "/reimbursements/new",
      session: createAuthSession("COLABORADOR")
    });

    await fillValidReimbursementForm();

    expect(await screen.findByText("A data da despesa nao pode ser futura.")).toBeInTheDocument();
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/reimbursements",
      expect.objectContaining({
        categoriaId: "cat-transporte",
        descricao: "Taxi para cliente",
        valor: 120
      })
    );
  });

  it("shows a friendly error when the API rejects a value above the category limit", async () => {
    mockedApi.post.mockRejectedValueOnce(makeApiError("Reimbursement amount exceeds category limit"));

    renderWithProviders(<ReimbursementNewPage />, {
      route: "/reimbursements/new",
      session: createAuthSession("COLABORADOR")
    });

    await fillValidReimbursementForm();

    expect(await screen.findByText("O valor excede o limite configurado para a categoria.")).toBeInTheDocument();
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/reimbursements",
      expect.objectContaining({
        categoriaId: "cat-transporte",
        descricao: "Taxi para cliente",
        valor: 120
      })
    );
  });
});
