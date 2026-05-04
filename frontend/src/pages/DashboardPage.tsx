import {
  Alert,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
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
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/categories";
import type {
  ReimbursementCategorySummary,
  ReimbursementDashboardSummary,
  ReimbursementListMeta,
  ReimbursementListResponse,
  ReimbursementStatus,
  ReimbursementSummary
} from "../types/reimbursements";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

type ReimbursementAction = "submit" | "approve" | "reject" | "pay" | "cancel";
type ReimbursementSortBy = "criadoEm" | "dataDespesa" | "valor";
type SortOrder = "asc" | "desc";

type ReimbursementListFilters = {
  categoriaId: string;
  page: number;
  pageSize: number;
  solicitante: string;
  sortBy: ReimbursementSortBy;
  sortOrder: SortOrder;
  status: ReimbursementStatus | "";
};

const reimbursementStatuses: ReimbursementStatus[] = [
  "RASCUNHO",
  "ENVIADO",
  "APROVADO",
  "REJEITADO",
  "PAGO",
  "CANCELADO"
];

const pageSizeOptions = [5, 10, 20, 50];

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

function getListParams(filters: ReimbursementListFilters, canSearchRequester: boolean) {
  const requesterFilter = canSearchRequester ? filters.solicitante.trim() : "";

  return {
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    ...(filters.categoriaId ? { categoriaId: filters.categoriaId } : {}),
    ...(requesterFilter ? { solicitante: requesterFilter } : {}),
    ...(filters.status ? { status: filters.status } : {})
  };
}

type SummaryCardProps = {
  label: string;
  value: string | number;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" minW="140px" p={4}>
      <Text color="gray.500" fontSize="sm">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
    </Box>
  );
}

export function DashboardPage() {
  const { clearSession, userRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const rejectModal = useDisclosure();
  const [reimbursements, setReimbursements] = useState<ReimbursementSummary[]>([]);
  const [listMeta, setListMeta] = useState<ReimbursementListMeta>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<ReimbursementListFilters>({
    categoriaId: "",
    page: 1,
    pageSize: 10,
    solicitante: "",
    sortBy: "criadoEm",
    sortOrder: "desc",
    status: ""
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReimbursementDashboardSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReimbursementSummary | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const showRequester = userRole !== "COLABORADOR";

  const fetchCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const response = await api.get<Category[]>("/categories");
      setCategories(response.data);
    } catch (caughtError) {
      if (getApiErrorStatus(caughtError) === 401) {
        clearSession();
        navigate("/login", {
          replace: true,
          state: { message: "Sessao expirada. Faca login novamente." }
        });
        return;
      }

      setCategoriesError(getApiErrorMessage(caughtError, "Nao foi possivel carregar categorias."));
    } finally {
      setIsCategoriesLoading(false);
    }
  }, [clearSession, navigate]);

  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);

    try {
      const response = await api.get<ReimbursementDashboardSummary>("/reimbursements/summary");
      setSummary(response.data);
    } catch (caughtError) {
      if (getApiErrorStatus(caughtError) === 401) {
        clearSession();
        navigate("/login", {
          replace: true,
          state: { message: "Sessao expirada. Faca login novamente." }
        });
        return;
      }

      setSummaryError(getApiErrorMessage(caughtError, "Nao foi possivel carregar o resumo."));
    } finally {
      setIsSummaryLoading(false);
    }
  }, [clearSession, navigate]);

  const fetchReimbursements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<ReimbursementListResponse>("/reimbursements", {
        params: getListParams(filters, showRequester)
      });
      setReimbursements(response.data.data);
      setListMeta(response.data.meta);
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
  }, [clearSession, filters, navigate, showRequester]);

  useEffect(() => {
    void fetchReimbursements();
  }, [fetchReimbursements]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const visibleCategories = useMemo<ReimbursementCategorySummary[]>(
    () => summary?.porCategoria.slice(0, 6) ?? [],
    [summary]
  );
  const activeCategories = useMemo(() => categories.filter((category) => category.active), [categories]);

  function isActionLoading(reimbursementId: string, action: ReimbursementAction) {
    return activeActionKey === getActionKey(reimbursementId, action);
  }

  function updateListFilters(nextFilters: Partial<Omit<ReimbursementListFilters, "page">>) {
    setFilters((current) => ({
      ...current,
      ...nextFilters,
      page: 1
    }));
  }

  function updateListPage(page: number) {
    setFilters((current) => ({
      ...current,
      page
    }));
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
      void fetchSummary();
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
            <StatusBadge status={reimbursement.status} />
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
      <PageHeader
        description={`${listMeta.total} solicitacao${listMeta.total === 1 ? "" : "es"} encontrada${listMeta.total === 1 ? "" : "s"}`}
        title="Dashboard"
        actions={
          <HStack flexWrap="wrap" justify={{ base: "stretch", md: "flex-end" }} w="100%">
            {userRole === "COLABORADOR" ? (
              <Button as={RouterLink} to="/reimbursements/new">
                Nova solicitacao
              </Button>
            ) : null}
            <Button isLoading={isLoading} variant="outline" onClick={() => void fetchReimbursements()}>
              Atualizar
            </Button>
          </HStack>
        }
      />

      {isSummaryLoading ? (
        <Stack spacing={4}>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
            <Skeleton height="96px" />
            <Skeleton height="96px" />
            <Skeleton height="96px" />
          </SimpleGrid>
          <Skeleton height="132px" />
        </Stack>
      ) : null}

      {!isSummaryLoading && summaryError ? (
        <Alert status="warning">
          <AlertIcon />
          {summaryError}
        </Alert>
      ) : null}

      {!isSummaryLoading && !summaryError && summary ? (
        <Stack spacing={4}>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
            <SummaryCard label="Total de solicitacoes" value={summary.totalSolicitacoes} />
            <SummaryCard label="Valor total" value={formatCurrency(summary.valorTotal)} />
            <SummaryCard label="Perfil" value={userRole ?? "-"} />
          </SimpleGrid>

          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
            <Text fontWeight="semibold" mb={4}>
              Totais por status
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing={3}>
              {summary.porStatus.map((entry) => (
                <Box key={entry.status} border="1px solid" borderColor="gray.100" borderRadius="md" p={3}>
                  <StatusBadge status={entry.status} />
                  <Text fontSize="xl" fontWeight="bold" mt={2}>
                    {entry.quantidade}
                  </Text>
                  <Text color="gray.500" fontSize="sm">
                    {formatCurrency(entry.valorTotal)}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          {visibleCategories.length > 0 ? (
            <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
              <Text fontWeight="semibold" mb={4}>
                Totais por categoria
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
                {visibleCategories.map((entry) => (
                  <Box key={entry.categoriaId} border="1px solid" borderColor="gray.100" borderRadius="md" p={3}>
                    <Text fontWeight="semibold">{entry.categoriaNome}</Text>
                    <Text color="gray.500" fontSize="sm">
                      {entry.quantidade} solicitacao{entry.quantidade === 1 ? "" : "es"}
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" mt={1}>
                      {formatCurrency(entry.valorTotal)}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          ) : null}
        </Stack>
      ) : null}

      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
        <Stack spacing={4}>
          <Flex align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={2} justify="space-between">
            <Text fontWeight="semibold">Filtros</Text>
            <Text color="gray.500" fontSize="sm">
              {listMeta.total} resultado{listMeta.total === 1 ? "" : "s"}
            </Text>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 2, xl: showRequester ? 6 : 5 }} spacing={4}>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                focusBorderColor="red.500"
                value={filters.status}
                onChange={(event) => updateListFilters({ status: event.target.value as ReimbursementStatus | "" })}
              >
                <option value="">Todos</option>
                {reimbursementStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Categoria</FormLabel>
              <Select
                focusBorderColor="red.500"
                isDisabled={isCategoriesLoading || Boolean(categoriesError)}
                value={filters.categoriaId}
                onChange={(event) => updateListFilters({ categoriaId: event.target.value })}
              >
                <option value="">Todas</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {categoriesError ? (
                <Text color="red.500" fontSize="sm" mt={2}>
                  {categoriesError}
                </Text>
              ) : null}
            </FormControl>

            {showRequester ? (
              <FormControl>
                <FormLabel>Colaborador</FormLabel>
                <Input
                  focusBorderColor="red.500"
                  placeholder="Nome ou email"
                  value={filters.solicitante}
                  onChange={(event) => updateListFilters({ solicitante: event.target.value })}
                />
              </FormControl>
            ) : null}

            <FormControl>
              <FormLabel>Ordenar por</FormLabel>
              <Select
                focusBorderColor="red.500"
                value={filters.sortBy}
                onChange={(event) => updateListFilters({ sortBy: event.target.value as ReimbursementSortBy })}
              >
                <option value="criadoEm">Criacao</option>
                <option value="dataDespesa">Data da despesa</option>
                <option value="valor">Valor</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Ordem</FormLabel>
              <Select
                focusBorderColor="red.500"
                value={filters.sortOrder}
                onChange={(event) => updateListFilters({ sortOrder: event.target.value as SortOrder })}
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Itens por pagina</FormLabel>
              <Select
                focusBorderColor="red.500"
                value={filters.pageSize}
                onChange={(event) => updateListFilters({ pageSize: Number(event.target.value) })}
              >
                {pageSizeOptions.map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </Select>
            </FormControl>
          </SimpleGrid>
        </Stack>
      </Box>

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
        <EmptyState
          description="Quando houver solicitacoes disponiveis para o seu perfil, elas aparecerao aqui."
          title="Nenhuma solicitacao encontrada"
          action={
            userRole === "COLABORADOR" ? (
              <Button as={RouterLink} colorScheme="red" to="/reimbursements/new">
                Criar solicitacao
              </Button>
            ) : null
          }
        />
      ) : null}

      {!isLoading && !error && reimbursements.length > 0 ? (
        <Stack spacing={4}>
          <TableContainer bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm">
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

          {listMeta.totalPages > 0 ? (
            <Flex
              align={{ base: "stretch", sm: "center" }}
              direction={{ base: "column", sm: "row" }}
              gap={3}
              justify="space-between"
            >
              <Text color="gray.600" fontSize="sm">
                Pagina {listMeta.page} de {listMeta.totalPages}
              </Text>
              <ButtonGroup size="sm" spacing={2}>
                <Button
                  isDisabled={listMeta.page <= 1}
                  variant="outline"
                  onClick={() => updateListPage(Math.max(1, listMeta.page - 1))}
                >
                  Anterior
                </Button>
                <Button
                  isDisabled={listMeta.page >= listMeta.totalPages}
                  variant="outline"
                  onClick={() => updateListPage(Math.min(listMeta.totalPages, listMeta.page + 1))}
                >
                  Proxima
                </Button>
              </ButtonGroup>
            </Flex>
          ) : null}
        </Stack>
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
