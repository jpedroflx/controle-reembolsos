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
  };
};

export type ReimbursementFormPayload = {
  categoriaId: string;
  descricao: string;
  valor: number;
  dataDespesa: string;
};
