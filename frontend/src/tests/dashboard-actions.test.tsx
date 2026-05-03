import { screen } from "@testing-library/react";
import type { Mock } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { api } from "../api/http";
import { DashboardPage } from "../pages/DashboardPage";
import type { ReimbursementStatus, ReimbursementSummary } from "../types/reimbursements";
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
};

function makeReimbursement(status: ReimbursementStatus): ReimbursementSummary {
  return {
    atualizadoEm: "2026-05-01T00:00:00.000Z",
    categoria: {
      ativo: true,
      id: "cat-alimentacao",
      nome: "Alimentacao"
    },
    categoriaId: "cat-alimentacao",
    criadoEm: "2026-05-01T00:00:00.000Z",
    dataDespesa: "2026-05-01T00:00:00.000Z",
    descricao: "Almoco em viagem",
    id: "req-1",
    justificativaRejeicao: null,
    solicitante: {
      email: "colaborador@teste.com",
      id: "user-colaborador",
      nome: "Usuario COLABORADOR",
      perfil: "COLABORADOR"
    },
    solicitanteId: "user-colaborador",
    status,
    valor: 50
  };
}

function makeReimbursementListResponse(reimbursements: ReimbursementSummary[]) {
  return {
    data: {
      data: reimbursements,
      meta: {
        page: 1,
        pageSize: 10,
        total: reimbursements.length,
        totalPages: reimbursements.length > 0 ? 1 : 0
      }
    }
  };
}

describe("DashboardPage role actions", () => {
  it("shows collaborator actions for draft reimbursements", async () => {
    mockedApi.get.mockResolvedValueOnce(makeReimbursementListResponse([makeReimbursement("RASCUNHO")]));

    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      session: createAuthSession("COLABORADOR")
    });

    expect(await screen.findByText("Almoco em viagem")).toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
  });

  it("shows manager actions for submitted reimbursements", async () => {
    mockedApi.get.mockResolvedValueOnce(makeReimbursementListResponse([makeReimbursement("ENVIADO")]));

    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      session: createAuthSession("GESTOR")
    });

    expect(await screen.findByText("Almoco em viagem")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
  });

  it("shows finance actions for approved reimbursements", async () => {
    mockedApi.get.mockResolvedValueOnce(makeReimbursementListResponse([makeReimbursement("APROVADO")]));

    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      session: createAuthSession("FINANCEIRO")
    });

    expect(await screen.findByText("Almoco em viagem")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
  });
});
