import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  Link as ChakraLink,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Skeleton,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
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
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import type {
  ReimbursementAttachment,
  ReimbursementDetail,
  ReimbursementHistoryAction
} from "../types/reimbursements";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

type ReimbursementAction = "submit" | "approve" | "reject" | "pay" | "cancel";

type AttachmentFormValues = {
  nomeArquivo: string;
  urlArquivo: string;
  tipoArquivo: ReimbursementAttachment["tipoArquivo"] | "";
};

type AttachmentFormErrors = Partial<Record<keyof AttachmentFormValues, string>>;

const historyLabels: Record<ReimbursementHistoryAction, string> = {
  CREATED: "Criada",
  UPDATED: "Atualizada",
  SUBMITTED: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  PAID: "Paga",
  CANCELED: "Cancelada"
};

const actionSuccessMessages: Record<ReimbursementAction, string> = {
  submit: "Solicitacao enviada.",
  approve: "Solicitacao aprovada.",
  reject: "Solicitacao rejeitada.",
  pay: "Solicitacao paga.",
  cancel: "Solicitacao cancelada."
};

const allowedAttachmentTypes: Array<ReimbursementAttachment["tipoArquivo"]> = ["PDF", "JPG", "JPEG", "PNG"];

const emptyAttachmentForm: AttachmentFormValues = {
  nomeArquivo: "",
  tipoArquivo: "",
  urlArquivo: ""
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function validateAttachment(values: AttachmentFormValues) {
  const errors: AttachmentFormErrors = {};

  if (!values.nomeArquivo.trim()) {
    errors.nomeArquivo = "Informe o nome do arquivo.";
  }

  if (!values.urlArquivo.trim()) {
    errors.urlArquivo = "Informe a URL simulada.";
  }

  if (!values.tipoArquivo) {
    errors.tipoArquivo = "Selecione o tipo do arquivo.";
  }

  return errors;
}

function getActionKey(reimbursementId: string, action: ReimbursementAction) {
  return `${reimbursementId}:${action}`;
}

export function ReimbursementDetailPage() {
  const { id } = useParams();
  const { clearSession, user, userRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const rejectModal = useDisclosure();
  const attachmentModal = useDisclosure();
  const [reimbursement, setReimbursement] = useState<ReimbursementDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [attachmentValues, setAttachmentValues] = useState<AttachmentFormValues>(emptyAttachmentForm);
  const [attachmentErrors, setAttachmentErrors] = useState<AttachmentFormErrors>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isAttachmentSubmitting, setIsAttachmentSubmitting] = useState(false);

  const fetchReimbursement = useCallback(async () => {
    if (!id) {
      setLoadError("Solicitacao nao encontrada.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await api.get<ReimbursementDetail>(`/reimbursements/${id}`);
      setReimbursement(response.data);
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
    void fetchReimbursement();
  }, [fetchReimbursement]);

  const canEditDraft = Boolean(
    reimbursement &&
      user &&
      userRole === "COLABORADOR" &&
      reimbursement.solicitanteId === user.id &&
      reimbursement.status === "RASCUNHO"
  );

  const availableActions = useMemo<ReimbursementAction[]>(() => {
    if (!reimbursement) {
      return [];
    }

    if (canEditDraft) {
      return ["submit", "cancel"];
    }

    if (userRole === "GESTOR" && reimbursement.status === "ENVIADO") {
      return ["approve", "reject"];
    }

    if (userRole === "FINANCEIRO" && reimbursement.status === "APROVADO") {
      return ["pay"];
    }

    return [];
  }, [canEditDraft, reimbursement, userRole]);

  function isActionLoading(action: ReimbursementAction) {
    if (!reimbursement) {
      return false;
    }

    return activeActionKey === getActionKey(reimbursement.id, action);
  }

  async function runTransition(action: ReimbursementAction, body?: Record<string, string>) {
    if (!reimbursement) {
      return false;
    }

    setActiveActionKey(getActionKey(reimbursement.id, action));

    try {
      const response = await api.post<ReimbursementDetail>(`/reimbursements/${reimbursement.id}/${action}`, body);
      setReimbursement(response.data);
      toast({
        description: actionSuccessMessages[action],
        status: "success"
      });
      return true;
    } catch (caughtError) {
      toast({
        description: getApiErrorMessage(caughtError, "Nao foi possivel concluir a acao."),
        status: "error"
      });
      return false;
    } finally {
      setActiveActionKey(null);
    }
  }

  async function confirmReject() {
    const trimmedReason = rejectionReason.trim();

    if (!trimmedReason) {
      setRejectionError("Informe a justificativa.");
      return;
    }

    const didReject = await runTransition("reject", {
      justificativaRejeicao: trimmedReason
    });

    if (didReject) {
      rejectModal.onClose();
      setRejectionReason("");
      setRejectionError(null);
    }
  }

  function openAttachmentModal() {
    setAttachmentValues(emptyAttachmentForm);
    setAttachmentErrors({});
    setAttachmentError(null);
    attachmentModal.onOpen();
  }

  async function submitAttachment() {
    if (!reimbursement) {
      return;
    }

    const nextErrors = validateAttachment(attachmentValues);
    setAttachmentErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !attachmentValues.tipoArquivo) {
      return;
    }

    setIsAttachmentSubmitting(true);
    setAttachmentError(null);

    try {
      const response = await api.post<ReimbursementAttachment>(`/reimbursements/${reimbursement.id}/attachments`, {
        nomeArquivo: attachmentValues.nomeArquivo.trim(),
        tipoArquivo: attachmentValues.tipoArquivo,
        urlArquivo: attachmentValues.urlArquivo.trim()
      });

      setReimbursement((current) =>
        current
          ? {
              ...current,
              anexos: [...current.anexos, response.data]
            }
          : current
      );
      toast({
        description: "Anexo adicionado.",
        status: "success"
      });
      attachmentModal.onClose();
    } catch (caughtError) {
      setAttachmentError(getApiErrorMessage(caughtError, "Nao foi possivel adicionar o anexo."));
    } finally {
      setIsAttachmentSubmitting(false);
    }
  }

  function renderActionButtons() {
    if (!reimbursement) {
      return null;
    }

    return (
      <ButtonGroup flexWrap="wrap" gap={2} justifyContent="flex-end" spacing={0}>
        <Button as={RouterLink} to="/dashboard" variant="outline">
          Voltar
        </Button>
        {canEditDraft ? (
          <>
            <Button as={RouterLink} to={`/reimbursements/${reimbursement.id}/edit`} variant="outline">
              Editar
            </Button>
            <Button colorScheme="gray" variant="outline" onClick={openAttachmentModal}>
              Adicionar anexo
            </Button>
          </>
        ) : null}
        {availableActions.includes("submit") ? (
          <Button
            colorScheme="blue"
            isLoading={isActionLoading("submit")}
            onClick={() => void runTransition("submit")}
          >
            Enviar
          </Button>
        ) : null}
        {availableActions.includes("cancel") ? (
          <Button
            colorScheme="orange"
            isLoading={isActionLoading("cancel")}
            variant="outline"
            onClick={() => void runTransition("cancel")}
          >
            Cancelar
          </Button>
        ) : null}
        {availableActions.includes("approve") ? (
          <Button
            colorScheme="green"
            isLoading={isActionLoading("approve")}
            onClick={() => void runTransition("approve")}
          >
            Aprovar
          </Button>
        ) : null}
        {availableActions.includes("reject") ? (
          <Button colorScheme="red" variant="outline" onClick={rejectModal.onOpen}>
            Rejeitar
          </Button>
        ) : null}
        {availableActions.includes("pay") ? (
          <Button colorScheme="purple" isLoading={isActionLoading("pay")} onClick={() => void runTransition("pay")}>
            Pagar
          </Button>
        ) : null}
      </ButtonGroup>
    );
  }

  return (
    <Stack spacing={6}>
      <PageHeader description={id} title="Detalhe da solicitacao" actions={renderActionButtons()} />

      {isLoading ? (
        <Stack>
          <Skeleton height="92px" />
          <Skeleton height="220px" />
          <Skeleton height="160px" />
        </Stack>
      ) : null}

      {!isLoading && loadError ? (
        <Alert status="error">
          <AlertIcon />
          <Flex align="center" gap={4} justify="space-between" w="100%">
            <Text>{loadError}</Text>
            <Button size="sm" variant="outline" onClick={() => void fetchReimbursement()}>
              Tentar novamente
            </Button>
          </Flex>
        </Alert>
      ) : null}

      {!isLoading && !loadError && reimbursement ? (
        <>
          <Grid gap={4} templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }}>
            <GridItem>
              <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" p={4}>
                <StatLabel>Status</StatLabel>
                <StatNumber>
                  <StatusBadge status={reimbursement.status} />
                </StatNumber>
              </Stat>
            </GridItem>
            <GridItem>
              <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" p={4}>
                <StatLabel>Valor</StatLabel>
                <StatNumber>{formatCurrency(reimbursement.valor)}</StatNumber>
              </Stat>
            </GridItem>
            <GridItem>
              <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" p={4}>
                <StatLabel>Categoria</StatLabel>
                <StatNumber fontSize="xl">{reimbursement.categoria.nome}</StatNumber>
              </Stat>
            </GridItem>
            <GridItem>
              <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" p={4}>
                <StatLabel>Data da despesa</StatLabel>
                <StatNumber fontSize="xl">{formatDate(reimbursement.dataDespesa)}</StatNumber>
              </Stat>
            </GridItem>
          </Grid>

          <Grid gap={4} templateColumns={{ base: "1fr", lg: "2fr 1fr" }}>
            <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={6}>
              <Stack spacing={4}>
                <Heading size="md">Dados da solicitacao</Heading>
                <Stack spacing={1}>
                  <Text color="gray.500" fontSize="sm">
                    Descricao
                  </Text>
                  <Text>{reimbursement.descricao}</Text>
                </Stack>
                {reimbursement.justificativaRejeicao ? (
                  <Alert status="error">
                    <AlertIcon />
                    {reimbursement.justificativaRejeicao}
                  </Alert>
                ) : null}
                <Divider />
                <Grid gap={4} templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}>
                  <Stack spacing={1}>
                    <Text color="gray.500" fontSize="sm">
                      Criada em
                    </Text>
                    <Text>{formatDateTime(reimbursement.criadoEm)}</Text>
                  </Stack>
                  <Stack spacing={1}>
                    <Text color="gray.500" fontSize="sm">
                      Atualizada em
                    </Text>
                    <Text>{formatDateTime(reimbursement.atualizadoEm)}</Text>
                  </Stack>
                </Grid>
              </Stack>
            </Box>

            <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={6}>
              <Stack spacing={4}>
                <Heading size="md">Solicitante</Heading>
                <Stack spacing={1}>
                  <Text color="gray.500" fontSize="sm">
                    Nome
                  </Text>
                  <Text fontWeight="semibold">{reimbursement.solicitante.nome}</Text>
                </Stack>
                <Stack spacing={1}>
                  <Text color="gray.500" fontSize="sm">
                    Email
                  </Text>
                  <Text>{reimbursement.solicitante.email}</Text>
                </Stack>
                <Stack spacing={1}>
                  <Text color="gray.500" fontSize="sm">
                    Perfil
                  </Text>
                  <Text>{reimbursement.solicitante.perfil}</Text>
                </Stack>
              </Stack>
            </Box>
          </Grid>

          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={6}>
            <Flex align="center" gap={4} justify="space-between" mb={4}>
              <Heading size="md">Anexos simulados</Heading>
              {canEditDraft ? (
                <Button size="sm" variant="outline" onClick={openAttachmentModal}>
                  Adicionar anexo
                </Button>
              ) : null}
            </Flex>

            {reimbursement.anexos.length === 0 ? (
              <EmptyState
                description="Anexos simulados adicionados em rascunho aparecerao aqui."
                framed={false}
                title="Nenhum anexo registrado"
              />
            ) : (
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Arquivo</Th>
                      <Th>Tipo</Th>
                      <Th>URL simulada</Th>
                      <Th>Criado em</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {reimbursement.anexos.map((attachment) => (
                      <Tr key={attachment.id}>
                        <Td>{attachment.nomeArquivo}</Td>
                        <Td>
                          <Badge>{attachment.tipoArquivo}</Badge>
                        </Td>
                        <Td>
                          <ChakraLink color="red.600" href={attachment.urlArquivo} isExternal>
                            {attachment.urlArquivo}
                          </ChakraLink>
                        </Td>
                        <Td>{formatDateTime(attachment.criadoEm)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={6}>
            <Heading mb={4} size="md">
              Historico
            </Heading>
            {reimbursement.historico.length === 0 ? (
              <EmptyState
                description="Acoes feitas na solicitacao aparecerao nesta linha do tempo."
                framed={false}
                title="Nenhum historico registrado"
              />
            ) : (
              <Stack spacing={4}>
                {reimbursement.historico.map((entry) => (
                  <Box key={entry.id} borderLeft="3px solid" borderColor="red.500" pl={4}>
                    <Flex gap={3} justify="space-between">
                      <Stack spacing={1}>
                        <Text fontWeight="semibold">{historyLabels[entry.acao]}</Text>
                        <Text color="gray.600">{entry.observacao}</Text>
                        <Text color="gray.500" fontSize="sm">
                          {entry.usuario.nome} ({entry.usuario.perfil})
                        </Text>
                      </Stack>
                      <Text color="gray.500" fontSize="sm">
                        {formatDateTime(entry.criadoEm)}
                      </Text>
                    </Flex>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </>
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
            <Button colorScheme="red" isLoading={isActionLoading("reject")} onClick={() => void confirmReject()}>
              Rejeitar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={attachmentModal.isOpen} onClose={attachmentModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Novo anexo simulado</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              {attachmentError ? (
                <Alert status="error">
                  <AlertIcon />
                  {attachmentError}
                </Alert>
              ) : null}
              <FormControl isInvalid={Boolean(attachmentErrors.nomeArquivo)} isRequired>
                <FormLabel>Nome do arquivo</FormLabel>
                <Input
                  value={attachmentValues.nomeArquivo}
                  onChange={(event) =>
                    setAttachmentValues((current) => ({ ...current, nomeArquivo: event.target.value }))
                  }
                />
                <FormErrorMessage>{attachmentErrors.nomeArquivo}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={Boolean(attachmentErrors.urlArquivo)} isRequired>
                <FormLabel>URL simulada</FormLabel>
                <Input
                  value={attachmentValues.urlArquivo}
                  onChange={(event) =>
                    setAttachmentValues((current) => ({ ...current, urlArquivo: event.target.value }))
                  }
                />
                <FormErrorMessage>{attachmentErrors.urlArquivo}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={Boolean(attachmentErrors.tipoArquivo)} isRequired>
                <FormLabel>Tipo</FormLabel>
                <Select
                  placeholder="Selecione"
                  value={attachmentValues.tipoArquivo}
                  onChange={(event) =>
                    setAttachmentValues((current) => ({
                      ...current,
                      tipoArquivo: event.target.value as AttachmentFormValues["tipoArquivo"]
                    }))
                  }
                >
                  {allowedAttachmentTypes.map((fileType) => (
                    <option key={fileType} value={fileType}>
                      {fileType}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{attachmentErrors.tipoArquivo}</FormErrorMessage>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} variant="ghost" onClick={attachmentModal.onClose}>
              Voltar
            </Button>
            <Button colorScheme="red" isLoading={isAttachmentSubmitting} onClick={() => void submitAttachment()}>
              Adicionar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
