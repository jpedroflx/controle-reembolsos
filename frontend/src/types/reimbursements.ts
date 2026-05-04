import type { UserRole } from "../contexts/AuthContext";

export type ReimbursementStatus = "RASCUNHO" | "ENVIADO" | "APROVADO" | "REJEITADO" | "PAGO" | "CANCELADO";

export type ReimbursementSummary = {
  id: string;
  solicitanteId: string;
  categoriaId: string;
  descricao: string;
  valor: number;
  dataDespesa: string;
  status: ReimbursementStatus;
  justificativaRejeicao: string | null;
  criadoEm: string;
  atualizadoEm: string;
  solicitante: {
    id: string;
    nome: string;
    email: string;
    perfil: UserRole;
  };
  categoria: {
    id: string;
    nome: string;
    ativo: boolean;
    valorMaximo?: number | null;
    anexoObrigatorioAcimaDe?: number | null;
  };
};

export type ReimbursementListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ReimbursementListResponse = {
  data: ReimbursementSummary[];
  meta: ReimbursementListMeta;
};

export type ReimbursementStatusSummary = {
  status: ReimbursementStatus;
  quantidade: number;
  valorTotal: number;
};

export type ReimbursementCategorySummary = {
  categoriaId: string;
  categoriaNome: string;
  quantidade: number;
  valorTotal: number;
};

export type ReimbursementDashboardSummary = {
  totalSolicitacoes: number;
  valorTotal: number;
  porStatus: ReimbursementStatusSummary[];
  porCategoria: ReimbursementCategorySummary[];
};

export type ReimbursementAttachment = {
  id: string;
  nomeArquivo: string;
  urlArquivo: string;
  tipoArquivo: "PDF" | "JPG" | "JPEG" | "PNG";
  criadoEm: string;
};

export type ReimbursementHistoryAction =
  | "CREATED"
  | "UPDATED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PAID"
  | "CANCELED";

export type ReimbursementHistoryEntry = {
  id: string;
  acao: ReimbursementHistoryAction;
  observacao: string;
  criadoEm: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    perfil: UserRole;
  };
};

export type ReimbursementDetail = ReimbursementSummary & {
  anexos: ReimbursementAttachment[];
  historico: ReimbursementHistoryEntry[];
};

export type ReimbursementFormPayload = {
  categoriaId: string;
  descricao: string;
  valor: number;
  dataDespesa: string;
};
