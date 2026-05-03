import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { api } from "../api/http";
import { useAuth } from "../contexts/AuthContext";
import type { ReimbursementStatus, ReimbursementSummary } from "../types/reimbursements";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

type ReimbursementAction = "submit" | "approve" | "reject" | "pay" | "cancel";

const statusLabels: Record<ReimbursementStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  PAGO: "Pago",
  CANCELADO: "Cancelado"
};

const statusColors: Record<ReimbursementStatus, string> = {
  RASCUNHO: "gray",
  ENVIADO: "blue",
  APROVADO: "green",
  REJEITADO: "red",
  PAGO: "purple",
  CANCELADO: "orange"
};

const actionSuccessMessages: Record<ReimbursementAction, string> = {
  submit: "Solicitacao enviada.",
  approve: "Solicitacao aprovada.",
  reject: "Solicitacao rejeitada.",
  pay: "Solicitacao paga.",
  cancel: "Solicitacao cancelada."
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC"
  }).format(new Date(value));
}

function getActionKey(reimbursementId: string, action: ReimbursementAction) {
  return `${reimbursementId}:${action}`;
}

export function DashboardPage() {
  const { clearSession, userRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const rejectModal = useDisclosure();
  const [reimbursements, setReimbursements] = useState<ReimbursementSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReimbursementSummary | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const showRequester = userRole !== "COLABORADOR";

  const fetchReimbursements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<ReimbursementSummary[]>("/reimbursements");
      setReimbursements(response.data);
    } catch (caughtError) {
      if (getApiErrorStatus(caughtError) === 401) {
        clearSession();
        navigate("/login", {
          replace: true,
          state: { message: "Sessao expirada. Faca login novamente." }
        });
        return;
      }

      setError(getApiErrorMessage(caughtError, "Nao foi possivel carregar as solicitacoes."));
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, navigate]);

  useEffect(() => {
    void fetchReimbursements();
  }, [fetchReimbursements]);

  const totalAmount = useMemo(
    () => reimbursements.reduce((total, reimbursement) => total + reimbursement.valor, 0),
    [reimbursements]
  );

  function isActionLoading(reimbursementId: string, action: ReimbursementAction) {
    return activeActionKey === getActionKey(reimbursementId, action);
  }

  async function runTransition(
    reimbursement: ReimbursementSummary,
    action: ReimbursementAction,
    body?: Record<string, string>
  ) {
    setActiveActionKey(getActionKey(reimbursement.id, action));

    try {
      await api.post(`/reimbursements/${reimbursement.id}/${action}`, body);
      toast({
        description: actionSuccessMessages[action],
        status: "success"
      });
      await fetchReimbursements();
    } catch (caughtError) {
      toast({
        description: getApiErrorMessage(caughtError, "Nao foi possivel concluir a acao."),
        status: "error"
      });
    } finally {
      setActiveActionKey(null);
    }
  }

  function openRejectModal(reimbursement: ReimbursementSummary) {
    setRejectTarget(reimbursement);
    setRejectionReason("");
    setRejectionError(null);
    rejectModal.onOpen();
  }

  async function confirmReject() {
    if (!rejectTarget) {
      return;
    }

    const trimmedReason = rejectionReason.trim();

    if (!trimmedReason) {
      setRejectionError("Informe a justificativa.");
      return;
    }

    await runTransition(rejectTarget, "reject", {
      justificativaRejeicao: trimmedReason
    });
    rejectModal.onClose();
    setRejectTarget(null);
  }

  function renderRoleActions(reimbursement: ReimbursementSummary) {
    if (userRole === "COLABORADOR" && reimbursement.status === "RASCUNHO") {
      return (
        <>
          <Button as={RouterLink} size="sm" to={`/reimbursements/${reimbursement.id}/edit`} variant="outline">
            Editar
          </Button>
          <Button
            colorScheme="blue"
            isLoading={isActionLoading(reimbursement.id, "submit")}
            size="sm"
            onClick={() => void runTransition(reimbursement, "submit")}
          >
            Enviar
          </Button>
          <Button
            colorScheme="orange"
            isLoading={isActionLoading(reimbursement.id, "cancel")}
            size="sm"
            variant="outline"
            onClick={() => void runTransition(reimbursement, "cancel")}
          >
            Cancelar
          </Button>
        </>
      );
    }

    if (userRole === "GESTOR" && reimbursement.status === "ENVIADO") {
      return (
        <>
          <Button
            colorScheme="green"
            isLoading={isActionLoading(reimbursement.id, "approve")}
            size="sm"
            onClick={() => void runTransition(reimbursement, "approve")}
          >
            Aprovar
          </Button>
          <Button colorScheme="red" size="sm" variant="outline" onClick={() => openRejectModal(reimbursement)}>
            Rejeitar
          </Button>
        </>
      );
    }

    if (userRole === "FINANCEIRO" && reimbursement.status === "APROVADO") {
      return (
        <Button
          colorScheme="purple"
          isLoading={isActionLoading(reimbursement.id, "pay")}
          size="sm"
          onClick={() => void runTransition(reimbursement, "pay")}
        >
          Pagar
        </Button>
      );
    }

    return null;
  }

  function renderRows() {
    return reimbursements.map((reimbursement) => {
      const roleActions = renderRoleActions(reimbursement);

      return (
        <Tr key={reimbursement.id}>
          <Td>
            <Stack spacing={1}>
              <Text fontWeight="semibold">{reimbursement.descricao}</Text>
              <Text color="gray.500" fontSize="sm">
                {reimbursement.id}
              </Text>
            </Stack>
          </Td>
          <Td>
            <Badge colorScheme={statusColors[reimbursement.status]}>{statusLabels[reimbursement.status]}</Badge>
          </Td>
          <Td isNumeric>{formatCurrency(reimbursement.valor)}</Td>
          <Td>{reimbursement.categoria.nome}</Td>
          <Td>{formatDate(reimbursement.dataDespesa)}</Td>
          {showRequester ? (
            <Td>
              <Stack spacing={0}>
                <Text>{reimbursement.solicitante.nome}</Text>
                <Text color="gray.500" fontSize="sm">
                  {reimbursement.solicitante.perfil}
                </Text>
              </Stack>
            </Td>
          ) : null}
          <Td>
            <ButtonGroup flexWrap="wrap" gap={2} justifyContent="flex-end" size="sm" spacing={0}>
              <Button as={RouterLink} to={`/reimbursements/${reimbursement.id}`} variant="ghost">
                Detalhe
              </Button>
              <Button as={RouterLink} to={`/reimbursements/${reimbursement.id}/history`} variant="ghost">
                Historico
              </Button>
              {roleActions}
            </ButtonGroup>
          </Td>
        </Tr>
      );
    });
  }

  return (
    <Stack spacing={6}>
      <Flex align={{ base: "flex-start", md: "center" }} gap={4} justify="space-between">
        <Stack spacing={1}>
          <Heading size="lg">Dashboard</Heading>
          <Text color="gray.600">
            {reimbursements.length} solicitacao{reimbursements.length === 1 ? "" : "es"} em exibicao
          </Text>
        </Stack>

        <HStack>
          {userRole === "COLABORADOR" ? (
            <Button as={RouterLink} colorScheme="red" to="/reimbursements/new">
              Nova solicitacao
            </Button>
          ) : null}
          <Button isLoading={isLoading} variant="outline" onClick={() => void fetchReimbursements()}>
            Atualizar
          </Button>
        </HStack>
      </Flex>

      <HStack spacing={4}>
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" minW="180px" p={4}>
          <Text color="gray.500" fontSize="sm">
            Total listado
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {formatCurrency(totalAmount)}
          </Text>
        </Box>
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" minW="140px" p={4}>
          <Text color="gray.500" fontSize="sm">
            Perfil
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {userRole ?? "-"}
          </Text>
        </Box>
      </HStack>

      {error ? (
        <Alert status="error">
          <AlertIcon />
          <Flex align="center" gap={4} justify="space-between" w="100%">
            <Text>{error}</Text>
            <Button size="sm" variant="outline" onClick={() => void fetchReimbursements()}>
              Tentar novamente
            </Button>
          </Flex>
        </Alert>
      ) : null}

      {isLoading ? (
        <Stack>
          <Skeleton height="56px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
        </Stack>
      ) : null}

      {!isLoading && !error && reimbursements.length === 0 ? (
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={8} textAlign="center">
          <Stack align="center" spacing={3}>
            <Heading size="md">Nenhuma solicitacao encontrada</Heading>
            {userRole === "COLABORADOR" ? (
              <Button as={RouterLink} colorScheme="red" to="/reimbursements/new">
                Criar solicitacao
              </Button>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      {!isLoading && !error && reimbursements.length > 0 ? (
        <TableContainer bg="white" border="1px solid" borderColor="gray.200" borderRadius="md">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Solicitacao</Th>
                <Th>Status</Th>
                <Th isNumeric>Valor</Th>
                <Th>Categoria</Th>
                <Th>Data</Th>
                {showRequester ? <Th>Solicitante</Th> : null}
                <Th textAlign="right">Acoes</Th>
              </Tr>
            </Thead>
            <Tbody>{renderRows()}</Tbody>
          </Table>
        </TableContainer>
      ) : null}

      <Modal isOpen={rejectModal.isOpen} onClose={rejectModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Rejeitar solicitacao</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isInvalid={Boolean(rejectionError)} isRequired>
              <FormLabel>Justificativa</FormLabel>
              <Textarea
                value={rejectionReason}
                onChange={(event) => {
                  setRejectionReason(event.target.value);
                  setRejectionError(null);
                }}
              />
              <FormErrorMessage>{rejectionError}</FormErrorMessage>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} variant="ghost" onClick={rejectModal.onClose}>
              Voltar
            </Button>
            <Button
              colorScheme="red"
              isLoading={rejectTarget ? isActionLoading(rejectTarget.id, "reject") : false}
              onClick={() => void confirmReject()}
            >
              Rejeitar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
