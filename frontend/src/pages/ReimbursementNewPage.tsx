import { Alert, AlertIcon, Button, Heading, Skeleton, Stack, Text, useToast } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { api } from "../api/http";
import { ReimbursementForm } from "../components/ReimbursementForm";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/categories";
import type { ReimbursementFormPayload } from "../types/reimbursements";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

export function ReimbursementNewPage() {
  const { clearSession, userRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setLoadError(null);

    try {
      const response = await api.get<Category[]>("/categories");
      setCategories(response.data.filter((category) => category.active));
    } catch (caughtError) {
      if (getApiErrorStatus(caughtError) === 401) {
        clearSession();
        navigate("/login", {
          replace: true,
          state: { message: "Sessao expirada. Faca login novamente." }
        });
        return;
      }

      setLoadError(getApiErrorMessage(caughtError, "Nao foi possivel carregar as categorias."));
    } finally {
      setIsLoadingCategories(false);
    }
  }, [clearSession, navigate]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  async function handleSubmit(payload: ReimbursementFormPayload) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.post("/reimbursements", payload);
      toast({
        description: "Solicitacao criada com sucesso.",
        status: "success"
      });
      navigate("/dashboard");
    } catch (caughtError) {
      setSubmitError(getApiErrorMessage(caughtError, "Nao foi possivel criar a solicitacao."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (userRole !== "COLABORADOR") {
    return (
      <Stack spacing={4}>
        <Heading size="lg">Nova solicitacao</Heading>
        <Alert status="warning">
          <AlertIcon />
          Apenas usuarios com perfil COLABORADOR podem criar solicitacoes.
        </Alert>
        <Button as={RouterLink} alignSelf="flex-start" to="/dashboard" variant="outline">
          Voltar ao dashboard
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={1}>
        <Heading size="lg">Nova solicitacao</Heading>
        <Text color="gray.600">Preencha os dados da despesa para criar um rascunho.</Text>
      </Stack>

      {isLoadingCategories ? (
        <Stack>
          <Skeleton height="64px" />
          <Skeleton height="260px" />
        </Stack>
      ) : null}

      {!isLoadingCategories && loadError ? (
        <Alert status="error">
          <AlertIcon />
          {loadError}
          <Button ml={4} size="sm" variant="outline" onClick={() => void fetchCategories()}>
            Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {!isLoadingCategories && !loadError && categories.length === 0 ? (
        <Alert status="warning">
          <AlertIcon />
          Nenhuma categoria ativa disponivel para novas solicitacoes.
        </Alert>
      ) : null}

      {!isLoadingCategories && !loadError && categories.length > 0 ? (
        <ReimbursementForm
          categories={categories}
          error={submitError}
          isSubmitting={isSubmitting}
          submitLabel="Criar solicitacao"
          onCancel={() => navigate("/dashboard")}
          onSubmit={handleSubmit}
        />
      ) : null}
    </Stack>
  );
}
