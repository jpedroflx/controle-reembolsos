import { useParams } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";

export function ReimbursementEditPage() {
  const { id } = useParams();

  return (
    <PagePlaceholder
      description={`Edição da solicitação ${id ?? ""}, permitida apenas quando estiver em RASCUNHO.`}
      title="Editar solicitação"
    />
  );
}
