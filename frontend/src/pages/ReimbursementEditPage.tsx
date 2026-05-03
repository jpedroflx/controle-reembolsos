import { Alert, AlertIcon, Button, Heading, Skeleton, Stack, Text, useToast } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/http";
import { ReimbursementForm } from "../components/ReimbursementForm";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/categories";
import type { ReimbursementFormPayload, ReimbursementSummary } from "../types/reimbursements";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

function toInputDate(value: string) {
  return value.slice(0, 10);
}

export function ReimbursementEditPage() {
  const { id } = useParams();
  const { clearSession, user, userRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [reimbursement, setReimbursement] = useState<ReimbursementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setLoadError("Solicitacao nao encontrada.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const [categoriesResponse, reimbursementResponse] = await Promise.all([
        api.get<Category[]>("/categories"),
        api.get<ReimbursementSummary>(`/reimbursements/${id}`)
      ]);

      setCategories(categoriesResponse.data.filter((category) => category.active));
      setReimbursement(reimbursementResponse.data);
    } catch (caughtError) {
      if (getApiErrorStatus(caughtError) === 401) {
        clearSession();
        navigate("/login", {
          replace: true,
          state: { message: "Sessao expirada. Faca login novamente." }
        });
        return;
      }

      setLoadError(getApiErrorMessage(caughtError, "Nao foi possivel carregar a solicitacao."));
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, id, navigate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const canEdit = Boolean(
    reimbursement &&
      user &&
      userRole === "COLABORADOR" &&
      reimbursement.solicitanteId === user.id &&
      reimbursement.status === "RASCUNHO"
  );

  const initialValues = useMemo(() => {
    if (!reimbursement) {
      return undefined;
    }

    return {
      categoriaId: reimbursement.categoriaId,
      descricao: reimbursement.descricao,
      valor: String(reimbursement.valor),
      dataDespesa: toInputDate(reimbursement.dataDespesa)
    };
  }, [reimbursement]);

  async function handleSubmit(payload: ReimbursementFormPayload) {
    if (!id) {
      setSubmitError("Solicitacao nao encontrada.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.put(`/reimbursements/${id}`, payload);
      toast({
        description: "Solicitacao atualizada com sucesso.",
        status: "success"
      });
      navigate("/dashboard");
    } catch (caughtError) {
      setSubmitError(getApiErrorMessage(caughtError, "Nao foi possivel atualizar a solicitacao."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={1}>
        <Heading size="lg">Editar solicitacao</Heading>
        <Text color="gray.600">Apenas o colaborador dono pode editar solicitacoes em rascunho.</Text>
      </Stack>

      {isLoading ? (
        <Stack>
          <Skeleton height="64px" />
          <Skeleton height="260px" />
        </Stack>
      ) : null}

      {!isLoading && loadError ? (
        <Alert status="error">
          <AlertIcon />
          {loadError}
          <Button ml={4} size="sm" variant="outline" onClick={() => void fetchData()}>
            Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {!isLoading && !loadError && reimbursement && !canEdit ? (
        <Stack spacing={4}>
          <Alert status="warning">
            <AlertIcon />
            Esta solicitacao nao pode ser editada por este usuario ou nao esta mais em RASCUNHO.
          </Alert>
          <Button as={RouterLink} alignSelf="flex-start" to="/dashboard" variant="outline">
            Voltar ao dashboard
          </Button>
        </Stack>
      ) : null}

      {!isLoading && !loadError && canEdit && categories.length === 0 ? (
        <Alert status="warning">
          <AlertIcon />
          Nenhuma categoria ativa disponivel para atualizar a solicitacao.
        </Alert>
      ) : null}

      {!isLoading && !loadError && canEdit && initialValues && categories.length > 0 ? (
        <ReimbursementForm
          categories={categories}
          error={submitError}
          initialValues={initialValues}
          isSubmitting={isSubmitting}
          submitLabel="Salvar alteracoes"
          onCancel={() => navigate("/dashboard")}
          onSubmit={handleSubmit}
        />
      ) : null}
    </Stack>
  );
}
