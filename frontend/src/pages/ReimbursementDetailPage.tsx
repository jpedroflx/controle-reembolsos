import { useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";

export function ReimbursementDetailPage() {
  const { id } = useParams();

  return (
    <PagePlaceholder
      description={`Detalhe da solicitação ${id ?? ""}, com dados, anexos e ações por perfil.`}
      title="Detalhe da solicitação"
    />
  );
}
