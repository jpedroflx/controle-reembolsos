import { Badge } from "@chakra-ui/react";

import type { ReimbursementStatus } from "../types/reimbursements";

const statusLabels: Record<ReimbursementStatus, string> = {
  APROVADO: "Aprovado",
  CANCELADO: "Cancelado",
  ENVIADO: "Enviado",
  PAGO: "Pago",
  RASCUNHO: "Rascunho",
  REJEITADO: "Rejeitado"
};

const statusColors: Record<ReimbursementStatus, string> = {
  APROVADO: "green",
  CANCELADO: "orange",
  ENVIADO: "blue",
  PAGO: "purple",
  RASCUNHO: "gray",
  REJEITADO: "red"
};

type StatusBadgeProps = {
  status: ReimbursementStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge colorScheme={statusColors[status]} fontSize="xs" px={2} py={1} rounded="full">
      {statusLabels[status]}
    </Badge>
  );
}

export { statusColors, statusLabels };
