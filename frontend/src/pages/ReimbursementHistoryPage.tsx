import { useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";

export function ReimbursementHistoryPage() {
  const { id } = useParams();

  return (
    <PagePlaceholder
      description={`Histórico da solicitação ${id ?? ""}, exibindo ação, usuário, data e observação.`}
      title="Histórico"
    />
  );
}
