import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast
} from "@chakra-ui/react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { api } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/categories";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

type CategoryFormErrors = {
  attachmentRequiredAboveAmount?: string;
  maxAmount?: string;
  name?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(value);
}

function formatMaxAmount(value: number | null) {
  return value === null ? "Sem limite" : formatCurrency(value);
}

function formatAttachmentRequirement(value: number | null) {
  return value === null ? "Nao exige" : formatCurrency(value);
}

function parseOptionalAmount(value: string) {
  return value.trim() ? Number(value) : null;
}

function validateCategoryForm(name: string, maxAmount: string, attachmentRequiredAboveAmount: string) {
  const errors: CategoryFormErrors = {};
  const parsedMaxAmount = parseOptionalAmount(maxAmount);
  const parsedAttachmentRequiredAboveAmount = parseOptionalAmount(attachmentRequiredAboveAmount);

  if (!name.trim()) {
    errors.name = "Informe o nome da categoria.";
  }

  if (parsedMaxAmount !== null && (!Number.isFinite(parsedMaxAmount) || parsedMaxAmount <= 0)) {
    errors.maxAmount = "Informe um limite maior que zero ou deixe em branco.";
  }

  if (
    parsedAttachmentRequiredAboveAmount !== null &&
    (!Number.isFinite(parsedAttachmentRequiredAboveAmount) || parsedAttachmentRequiredAboveAmount <= 0)
  ) {
    errors.attachmentRequiredAboveAmount = "Informe um valor maior que zero ou deixe em branco.";
  }

  return errors;
}

export function CategoriesPage() {
  const { clearSession, userRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const editModal = useDisclosure();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createMaxAmount, setCreateMaxAmount] = useState("");
  const [createAttachmentRequiredAboveAmount, setCreateAttachmentRequiredAboveAmount] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [createErrors, setCreateErrors] = useState<CategoryFormErrors>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editMaxAmount, setEditMaxAmount] = useState("");
  const [editAttachmentRequiredAboveAmount, setEditAttachmentRequiredAboveAmount] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editErrors, setEditErrors] = useState<CategoryFormErrors>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const activeCount = useMemo(() => categories.filter((category) => category.active).length, [categories]);
  const inactiveCount = categories.length - activeCount;

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await api.get<Category[]>("/categories");
      setCategories(response.data);
    } catch (caughtError) {
      const status = getApiErrorStatus(caughtError);

      if (status === 401) {
        clearSession();
        navigate("/login", {
          replace: true,
          state: { message: "Sessao expirada. Faca login novamente." }
        });
        return;
      }

      if (status === 403) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setLoadError(getApiErrorMessage(caughtError, "Nao foi possivel carregar as categorias."));
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, navigate]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);

    const nextErrors = validateCategoryForm(createName, createMaxAmount, createAttachmentRequiredAboveAmount);
    setCreateErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await api.post<Category>("/categories", {
        active: createActive,
        attachmentRequiredAboveAmount: parseOptionalAmount(createAttachmentRequiredAboveAmount),
        maxAmount: parseOptionalAmount(createMaxAmount),
        name: createName.trim()
      });
      setCategories((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setCreateName("");
      setCreateMaxAmount("");
      setCreateAttachmentRequiredAboveAmount("");
      setCreateActive(true);
      toast({
        description: "Categoria criada com sucesso.",
        status: "success"
      });
    } catch (caughtError) {
      setCreateError(getApiErrorMessage(caughtError, "Nao foi possivel criar a categoria."));
    } finally {
      setIsCreating(false);
    }
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setEditName(category.name);
    setEditMaxAmount(category.maxAmount === null ? "" : String(category.maxAmount));
    setEditAttachmentRequiredAboveAmount(
      category.attachmentRequiredAboveAmount === null ? "" : String(category.attachmentRequiredAboveAmount)
    );
    setEditActive(category.active);
    setEditErrors({});
    setEditError(null);
    editModal.onOpen();
  }

  async function handleEdit() {
    if (!editingCategory) {
      return;
    }

    setEditError(null);
    const nextErrors = validateCategoryForm(editName, editMaxAmount, editAttachmentRequiredAboveAmount);
    setEditErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsEditing(true);

    try {
      const response = await api.put<Category>(`/categories/${editingCategory.id}`, {
        active: editActive,
        attachmentRequiredAboveAmount: parseOptionalAmount(editAttachmentRequiredAboveAmount),
        maxAmount: parseOptionalAmount(editMaxAmount),
        name: editName.trim()
      });
      setCategories((current) =>
        current.map((category) => (category.id === response.data.id ? response.data : category))
      );
      toast({
        description: "Categoria atualizada com sucesso.",
        status: "success"
      });
      editModal.onClose();
      setEditingCategory(null);
    } catch (caughtError) {
      setEditError(getApiErrorMessage(caughtError, "Nao foi possivel atualizar a categoria."));
    } finally {
      setIsEditing(false);
    }
  }

  async function toggleCategory(category: Category) {
    setTogglingId(category.id);

    try {
      const response = await api.put<Category>(`/categories/${category.id}`, {
        active: !category.active
      });
      setCategories((current) =>
        current.map((currentCategory) =>
          currentCategory.id === response.data.id ? response.data : currentCategory
        )
      );
      toast({
        description: response.data.active ? "Categoria ativada." : "Categoria inativada.",
        status: "success"
      });
    } catch (caughtError) {
      toast({
        description: getApiErrorMessage(caughtError, "Nao foi possivel alterar o status da categoria."),
        status: "error"
      });
    } finally {
      setTogglingId(null);
    }
  }

  if (userRole !== "ADMIN") {
    return (
      <Stack spacing={4}>
        <PageHeader title="Gestao de categorias" />
        <Alert status="warning">
          <AlertIcon />
          Apenas usuarios ADMIN podem acessar esta area.
        </Alert>
        <Button as={RouterLink} alignSelf="flex-start" to="/dashboard" variant="outline">
          Voltar ao dashboard
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={6}>
      <PageHeader
        description="Crie, edite e ative ou inative categorias de reembolso."
        title="Gestao de categorias"
        actions={
          <Button isLoading={isLoading} variant="outline" onClick={() => void fetchCategories()}>
            Atualizar
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">
            Total
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {categories.length}
          </Text>
        </Box>
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">
            Ativas
          </Text>
          <Text color="green.600" fontSize="2xl" fontWeight="bold">
            {activeCount}
          </Text>
        </Box>
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">
            Inativas
          </Text>
          <Text color="gray.700" fontSize="2xl" fontWeight="bold">
            {inactiveCount}
          </Text>
        </Box>
      </SimpleGrid>

      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" p={{ base: 5, md: 6 }}>
        <Box as="form" noValidate onSubmit={handleCreate}>
          <Stack spacing={4}>
            <Heading size="md">Nova categoria</Heading>

            {createError ? (
              <Alert status="error">
                <AlertIcon />
                {createError}
              </Alert>
            ) : null}

            <Flex align={{ base: "stretch", md: "flex-start" }} direction={{ base: "column", md: "row" }} gap={4}>
              <FormControl isInvalid={Boolean(createErrors.name)} isRequired>
                <FormLabel>Nome</FormLabel>
                <Input focusBorderColor="red.500" value={createName} onChange={(event) => setCreateName(event.target.value)} />
                <FormErrorMessage>{createErrors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(createErrors.maxAmount)} maxW={{ base: "full", md: "220px" }}>
                <FormLabel>Limite</FormLabel>
                <Input
                  focusBorderColor="red.500"
                  min="0.01"
                  placeholder="Sem limite"
                  step="0.01"
                  type="number"
                  value={createMaxAmount}
                  onChange={(event) => setCreateMaxAmount(event.target.value)}
                />
                <FormErrorMessage>{createErrors.maxAmount}</FormErrorMessage>
              </FormControl>

              <FormControl
                isInvalid={Boolean(createErrors.attachmentRequiredAboveAmount)}
                maxW={{ base: "full", md: "240px" }}
              >
                <FormLabel>Anexo acima de</FormLabel>
                <Input
                  focusBorderColor="red.500"
                  min="0.01"
                  placeholder="Nao exige"
                  step="0.01"
                  type="number"
                  value={createAttachmentRequiredAboveAmount}
                  onChange={(event) => setCreateAttachmentRequiredAboveAmount(event.target.value)}
                />
                <FormErrorMessage>{createErrors.attachmentRequiredAboveAmount}</FormErrorMessage>
              </FormControl>

              <FormControl maxW={{ base: "full", md: "180px" }}>
                <FormLabel>Status</FormLabel>
                <Checkbox isChecked={createActive} onChange={(event) => setCreateActive(event.target.checked)}>
                  Ativa
                </Checkbox>
              </FormControl>

              <Button
                alignSelf={{ base: "stretch", md: "flex-end" }}
                colorScheme="red"
                isLoading={isCreating}
                type="submit"
              >
                Criar
              </Button>
            </Flex>
          </Stack>
        </Box>
      </Box>

      {isLoading ? (
        <Stack>
          <Skeleton height="56px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
        </Stack>
      ) : null}

      {!isLoading && loadError ? (
        <Alert status="error">
          <AlertIcon />
          <Flex align="center" gap={4} justify="space-between" w="100%">
            <Text>{loadError}</Text>
            <Button size="sm" variant="outline" onClick={() => void fetchCategories()}>
              Tentar novamente
            </Button>
          </Flex>
        </Alert>
      ) : null}

      {!isLoading && !loadError && categories.length === 0 ? (
        <EmptyState
          description="Cadastre categorias para que colaboradores possam classificar novas solicitacoes."
          title="Nenhuma categoria cadastrada"
        />
      ) : null}

      {!isLoading && !loadError && categories.length > 0 ? (
        <TableContainer bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Nome</Th>
                <Th isNumeric>Limite</Th>
                <Th isNumeric>Anexo acima de</Th>
                <Th>Status</Th>
                <Th>Criada em</Th>
                <Th>Atualizada em</Th>
                <Th textAlign="right">Acoes</Th>
              </Tr>
            </Thead>
            <Tbody>
              {categories.map((category) => (
                <Tr key={category.id}>
                  <Td fontWeight="semibold">{category.name}</Td>
                  <Td isNumeric>{formatMaxAmount(category.maxAmount)}</Td>
                  <Td isNumeric>{formatAttachmentRequirement(category.attachmentRequiredAboveAmount)}</Td>
                  <Td>
                    <HStack>
                      <Switch
                        colorScheme="red"
                        isChecked={category.active}
                        isDisabled={togglingId === category.id}
                        onChange={() => void toggleCategory(category)}
                      />
                      <Badge colorScheme={category.active ? "green" : "gray"}>
                        {category.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </HStack>
                  </Td>
                  <Td>{formatDateTime(category.createdAt)}</Td>
                  <Td>{formatDateTime(category.updatedAt)}</Td>
                  <Td>
                    <ButtonGroup display="flex" justifyContent="flex-end" size="sm">
                      <Button variant="outline" onClick={() => openEditModal(category)}>
                        Editar
                      </Button>
                    </ButtonGroup>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      ) : null}

      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Editar categoria</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              {editError ? (
                <Alert status="error">
                  <AlertIcon />
                  {editError}
                </Alert>
              ) : null}

              <FormControl isInvalid={Boolean(editErrors.name)} isRequired>
                <FormLabel>Nome</FormLabel>
                <Input focusBorderColor="red.500" value={editName} onChange={(event) => setEditName(event.target.value)} />
                <FormErrorMessage>{editErrors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(editErrors.maxAmount)}>
                <FormLabel>Limite</FormLabel>
                <Input
                  focusBorderColor="red.500"
                  min="0.01"
                  placeholder="Sem limite"
                  step="0.01"
                  type="number"
                  value={editMaxAmount}
                  onChange={(event) => setEditMaxAmount(event.target.value)}
                />
                <FormErrorMessage>{editErrors.maxAmount}</FormErrorMessage>
                <Text color="gray.500" fontSize="sm" mt={2}>
                  Deixe em branco para remover o limite da categoria.
                </Text>
              </FormControl>

              <FormControl isInvalid={Boolean(editErrors.attachmentRequiredAboveAmount)}>
                <FormLabel>Anexo acima de</FormLabel>
                <Input
                  focusBorderColor="red.500"
                  min="0.01"
                  placeholder="Nao exige"
                  step="0.01"
                  type="number"
                  value={editAttachmentRequiredAboveAmount}
                  onChange={(event) => setEditAttachmentRequiredAboveAmount(event.target.value)}
                />
                <FormErrorMessage>{editErrors.attachmentRequiredAboveAmount}</FormErrorMessage>
                <Text color="gray.500" fontSize="sm" mt={2}>
                  Deixe em branco para nao exigir anexo por valor.
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Switch
                  colorScheme="red"
                  isChecked={editActive}
                  onChange={(event) => setEditActive(event.target.checked)}
                />
                <Text color="gray.500" fontSize="sm" mt={2}>
                  Categorias inativas deixam de aparecer em novas solicitacoes.
                </Text>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} variant="ghost" onClick={editModal.onClose}>
              Voltar
            </Button>
            <Button colorScheme="red" isLoading={isEditing} onClick={() => void handleEdit()}>
              Salvar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
