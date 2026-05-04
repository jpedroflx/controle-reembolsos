import { screen } from "@testing-library/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/http";
import { DashboardPage } from "../pages/DashboardPage";
import type {
  ReimbursementDashboardSummary,
  ReimbursementStatus,
  ReimbursementSummary
} from "../types/reimbursements";
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

function makeDashboardSummary(): ReimbursementDashboardSummary {
  return {
    porCategoria: [
      {
        categoriaId: "cat-alimentacao",
        categoriaNome: "Alimentacao",
        quantidade: 2,
        valorTotal: 150
      }
    ],
    porStatus: [
      {
        quantidade: 1,
        status: "RASCUNHO",
        valorTotal: 50
      },
      {
        quantidade: 1,
        status: "ENVIADO",
        valorTotal: 100
      },
      {
        quantidade: 0,
        status: "APROVADO",
        valorTotal: 0
      },
      {
        quantidade: 0,
        status: "REJEITADO",
        valorTotal: 0
      },
      {
        quantidade: 0,
        status: "PAGO",
        valorTotal: 0
      },
      {
        quantidade: 0,
        status: "CANCELADO",
        valorTotal: 0
      }
    ],
    totalSolicitacoes: 2,
    valorTotal: 150
  };
}

function mockDashboardRequests(reimbursements: ReimbursementSummary[]) {
  mockedApi.get.mockImplementation((url: string) => {
    if (url === "/reimbursements") {
      return Promise.resolve(makeReimbursementListResponse(reimbursements));
    }

    if (url === "/reimbursements/summary") {
      return Promise.resolve({ data: makeDashboardSummary() });
    }

    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

describe("DashboardPage role actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows collaborator actions for draft reimbursements", async () => {
    mockDashboardRequests([makeReimbursement("RASCUNHO")]);

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
    mockDashboardRequests([makeReimbursement("ENVIADO")]);

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
    mockDashboardRequests([makeReimbursement("APROVADO")]);

    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      session: createAuthSession("FINANCEIRO")
    });

    expect(await screen.findByText("Almoco em viagem")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
  });

  it("shows dashboard summary cards", async () => {
    mockDashboardRequests([makeReimbursement("RASCUNHO")]);

    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      session: createAuthSession("ADMIN")
    });

    expect(await screen.findByText("Total de solicitacoes")).toBeInTheDocument();
    expect(screen.getByText("Valor total")).toBeInTheDocument();
    expect(screen.getByText("Totais por status")).toBeInTheDocument();
    expect(screen.getByText("Totais por categoria")).toBeInTheDocument();
    expect(screen.getAllByText("Alimentacao").length).toBeGreaterThan(0);
    expect(screen.getAllByText((content) => content.includes("150,00")).length).toBeGreaterThan(0);
  });
});
