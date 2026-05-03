import { Alert, AlertIcon, Badge, Box, Button, Flex, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import type { ReimbursementHistoryAction, ReimbursementHistoryEntry } from "../types/reimbursements";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

const historyLabels: Record<ReimbursementHistoryAction, string> = {
  APPROVED: "Aprovada",
  CANCELED: "Cancelada",
  CREATED: "Criada",
  PAID: "Paga",
  REJECTED: "Rejeitada",
  SUBMITTED: "Enviada",
  UPDATED: "Atualizada"
};

const historyColorSchemes: Record<ReimbursementHistoryAction, string> = {
  APPROVED: "green",
  CANCELED: "orange",
  CREATED: "blue",
  PAID: "purple",
  REJECTED: "red",
  SUBMITTED: "cyan",
  UPDATED: "gray"
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function ReimbursementHistoryPage() {
  const { id } = useParams();
  const { clearSession } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<ReimbursementHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!id) {
      setLoadError("Solicitacao nao encontrada.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await api.get<ReimbursementHistoryEntry[]>(`/reimbursements/${id}/history`);
      setHistory(response.data);
    } catch (caughtError) {
      if (getApiErrorStatus(caughtError) === 401) {
        clearSession();
        navigate("/login", {
          replace: true,
          state: { message: "Sessao expirada. Faca login novamente." }
        });
        return;
      }

      setLoadError(getApiErrorMessage(caughtError, "Nao foi possivel carregar o historico."));
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, id, navigate]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <Stack spacing={6}>
      <PageHeader
        actions={
          <Button as={RouterLink} to={id ? `/reimbursements/${id}` : "/dashboard"} variant="outline">
            Voltar
          </Button>
        }
        description={id}
        title="Historico da solicitacao"
      />

      {isLoading ? (
        <Stack spacing={3}>
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </Stack>
      ) : null}

      {!isLoading && loadError ? (
        <Alert status="error">
          <AlertIcon />
          <Flex align="center" gap={4} justify="space-between" w="100%">
            <Text>{loadError}</Text>
            <Button size="sm" variant="outline" onClick={() => void fetchHistory()}>
              Tentar novamente
            </Button>
          </Flex>
        </Alert>
      ) : null}

      {!isLoading && !loadError && history.length === 0 ? (
        <EmptyState
          description="As acoes registradas para esta solicitacao aparecerao aqui."
          title="Nenhum historico registrado"
        />
      ) : null}

      {!isLoading && !loadError && history.length > 0 ? (
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={{ base: 4, md: 6 }}>
          <Stack spacing={4}>
            {history.map((entry) => (
              <Box key={entry.id} borderLeft="3px solid" borderColor="red.500" pl={4}>
                <Flex
                  align={{ base: "flex-start", md: "center" }}
                  direction={{ base: "column", md: "row" }}
                  gap={3}
                  justify="space-between"
                >
                  <Stack spacing={1}>
                    <Flex align="center" gap={2} wrap="wrap">
                      <Badge colorScheme={historyColorSchemes[entry.acao]}>{historyLabels[entry.acao]}</Badge>
                      <Text color="gray.500" fontSize="sm">
                        {formatDateTime(entry.criadoEm)}
                      </Text>
                    </Flex>
                    <Text color="gray.700">{entry.observacao}</Text>
                    <Text color="gray.500" fontSize="sm">
                      {entry.usuario.nome} ({entry.usuario.perfil}) - {entry.usuario.email}
                    </Text>
                  </Stack>
                </Flex>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}
