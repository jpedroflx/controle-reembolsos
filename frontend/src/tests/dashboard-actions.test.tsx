import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/http";
import { DashboardPage } from "../pages/DashboardPage";
import type { Category } from "../types/categories";
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

const categories: Category[] = [
  {
    active: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    id: "cat-alimentacao",
    attachmentRequiredAboveAmount: null,
    maxAmount: null,
    name: "Alimentacao",
    updatedAt: "2026-05-01T00:00:00.000Z"
  },
  {
    active: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    id: "cat-inativa",
    attachmentRequiredAboveAmount: null,
    maxAmount: null,
    name: "Categoria inativa",
    updatedAt: "2026-05-01T00:00:00.000Z"
  }
];

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

function makeReimbursementListResponse(
  reimbursements: ReimbursementSummary[],
  meta: Partial<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> = {}
) {
  return {
    data: {
      data: reimbursements,
      meta: {
        page: meta.page ?? 1,
        pageSize: meta.pageSize ?? 10,
        total: meta.total ?? reimbursements.length,
        totalPages: meta.totalPages ?? (reimbursements.length > 0 ? 1 : 0)
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

function mockDashboardRequests(
  reimbursements: ReimbursementSummary[],
  meta?: Parameters<typeof makeReimbursementListResponse>[1]
) {
  mockedApi.get.mockImplementation((url: string) => {
    if (url === "/reimbursements") {
      return Promise.resolve(makeReimbursementListResponse(reimbursements, meta));
    }

    if (url === "/reimbursements/summary") {
      return Promise.resolve({ data: makeDashboardSummary() });
    }

    if (url === "/categories") {
      return Promise.resolve({ data: categories });
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

  it("shows list filters, sorting controls and pagination state", async () => {
    mockDashboardRequests([makeReimbursement("RASCUNHO")], {
      total: 15,
      totalPages: 2
    });

    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      session: createAuthSession("ADMIN")
    });

    expect(await screen.findByText("Almoco em viagem")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alimentacao" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Categoria inativa" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Colaborador")).toBeInTheDocument();
    expect(screen.getByLabelText("Ordenar por")).toBeInTheDocument();
    expect(screen.getByLabelText("Ordem")).toBeInTheDocument();
    expect(screen.getByLabelText("Itens por pagina")).toBeInTheDocument();
    expect(screen.getByText("Pagina 1 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Proxima" })).toBeEnabled();
  });

  it("combines filters, sorting and pagination params", async () => {
    mockDashboardRequests([makeReimbursement("APROVADO")], {
      total: 30,
      totalPages: 3
    });

    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      session: createAuthSession("ADMIN")
    });

    await screen.findByText("Almoco em viagem");
    await screen.findByRole("option", { name: "Alimentacao" });

    fireEvent.change(screen.getByLabelText("Status"), {
      target: {
        value: "APROVADO"
      }
    });
    fireEvent.change(screen.getByLabelText("Categoria"), {
      target: {
        value: "cat-alimentacao"
      }
    });
    fireEvent.change(screen.getByLabelText("Colaborador"), {
      target: {
        value: "colaborador@teste.com"
      }
    });
    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: {
        value: "valor"
      }
    });
    fireEvent.change(screen.getByLabelText("Ordem"), {
      target: {
        value: "asc"
      }
    });
    fireEvent.change(screen.getByLabelText("Itens por pagina"), {
      target: {
        value: "20"
      }
    });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith("/reimbursements", {
        params: {
          categoriaId: "cat-alimentacao",
          page: 1,
          pageSize: 20,
          solicitante: "colaborador@teste.com",
          sortBy: "valor",
          sortOrder: "asc",
          status: "APROVADO"
        }
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Proxima" }));

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith("/reimbursements", {
        params: {
          categoriaId: "cat-alimentacao",
          page: 2,
          pageSize: 20,
          solicitante: "colaborador@teste.com",
          sortBy: "valor",
          sortOrder: "asc",
          status: "APROVADO"
        }
      });
    });
  });

  it("hides requester search for collaborators", async () => {
    mockDashboardRequests([makeReimbursement("RASCUNHO")]);

    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      session: createAuthSession("COLABORADOR")
    });

    await screen.findByText("Almoco em viagem");

    expect(screen.queryByLabelText("Colaborador")).not.toBeInTheDocument();
  });
});
