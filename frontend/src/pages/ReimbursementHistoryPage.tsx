import { useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";

export function ReimbursementHistoryPage() {
  const { id } = useParams();

  return (
    <PagePlaceholder
      description={`Historico da solicitacao ${id ?? ""}, exibindo acao, usuario, data e observacao.`}
      title="Historico"
    />
  );
}
