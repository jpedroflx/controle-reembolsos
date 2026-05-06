import { screen } from "@testing-library/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

import { api } from "../api/http";
import { ReimbursementDetailPage } from "../pages/ReimbursementDetailPage";
import type { ReimbursementDetail } from "../types/reimbursements";
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

function makeDetail(overrides: Partial<ReimbursementDetail> = {}): ReimbursementDetail {
  return {
    anexos: [],
    atualizadoEm: "2026-05-01T00:00:00.000Z",
    categoria: {
      anexoObrigatorioAcimaDe: 100,
      ativo: true,
      id: "cat-transporte",
      nome: "Transporte",
      valorMaximo: null
    },
    categoriaId: "cat-transporte",
    criadoEm: "2026-05-01T00:00:00.000Z",
    dataDespesa: "2026-05-01T00:00:00.000Z",
    descricao: "Viagem para cliente",
    historico: [],
    id: "req-1",
    justificativaRejeicao: null,
    solicitante: {
      email: "colaborador@teste.com",
      id: "user-colaborador",
      nome: "Usuario COLABORADOR",
      perfil: "COLABORADOR"
    },
    solicitanteId: "user-colaborador",
    status: "RASCUNHO",
    valor: 150,
    ...overrides
  };
}

describe("ReimbursementDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("warns when a draft requires an attachment before submit", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: makeDetail()
    });

    renderWithProviders(
      <Routes>
        <Route element={<ReimbursementDetailPage />} path="/reimbursements/:id" />
      </Routes>,
      {
        route: "/reimbursements/req-1",
        session: createAuthSession("COLABORADOR")
      }
    );

    expect(await screen.findByText(/Adicione pelo menos um anexo antes de enviar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });

  it("shows secure actions for simulated attachments", async () => {
    const attachmentUrl = "https://example.com/comprovante.pdf";

    mockedApi.get.mockResolvedValueOnce({
      data: makeDetail({
        anexos: [
          {
            criadoEm: "2026-05-01T00:00:00.000Z",
            id: "att-1",
            nomeArquivo: "comprovante.pdf",
            tipoArquivo: "PDF",
            urlArquivo: attachmentUrl
          }
        ]
      })
    });

    renderWithProviders(
      <Routes>
        <Route element={<ReimbursementDetailPage />} path="/reimbursements/:id" />
      </Routes>,
      {
        route: "/reimbursements/req-1",
        session: createAuthSession("COLABORADOR")
      }
    );

    expect(await screen.findByText("comprovante.pdf")).toBeInTheDocument();

    const previewLink = screen.getByRole("link", { name: "Visualizar" });
    const openLink = screen.getByRole("link", { name: "Baixar/Abrir" });

    expect(previewLink).toHaveAttribute("href", attachmentUrl);
    expect(previewLink).toHaveAttribute("target", "_blank");
    expect(previewLink).toHaveAttribute("rel", "noreferrer");
    expect(openLink).toHaveAttribute("href", attachmentUrl);
    expect(openLink).toHaveAttribute("target", "_blank");
    expect(openLink).toHaveAttribute("rel", "noreferrer");
  });
});
