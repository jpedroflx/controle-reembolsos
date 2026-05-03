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
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { api } from "../api/http";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/categories";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

type CategoryFormErrors = {
  name?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function validateCategoryName(name: string) {
  const errors: CategoryFormErrors = {};

  if (!name.trim()) {
    errors.name = "Informe o nome da categoria.";
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
  const [createActive, setCreateActive] = useState(true);
  const [createErrors, setCreateErrors] = useState<CategoryFormErrors>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editErrors, setEditErrors] = useState<CategoryFormErrors>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

    const nextErrors = validateCategoryName(createName);
    setCreateErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await api.post<Category>("/categories", {
        active: createActive,
        name: createName.trim()
      });
      setCategories((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setCreateName("");
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
    const nextErrors = validateCategoryName(editName);
    setEditErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsEditing(true);

    try {
      const response = await api.put<Category>(`/categories/${editingCategory.id}`, {
        active: editActive,
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
        <Heading size="lg">Gestao de categorias</Heading>
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
      <Flex align={{ base: "flex-start", md: "center" }} gap={4} justify="space-between">
        <Stack spacing={1}>
          <Heading size="lg">Gestao de categorias</Heading>
          <Text color="gray.600">Crie, edite e ative ou inative categorias de reembolso.</Text>
        </Stack>
        <Button isLoading={isLoading} variant="outline" onClick={() => void fetchCategories()}>
          Atualizar
        </Button>
      </Flex>

      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={6}>
        <Box as="form" onSubmit={handleCreate}>
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
                <Input value={createName} onChange={(event) => setCreateName(event.target.value)} />
                <FormErrorMessage>{createErrors.name}</FormErrorMessage>
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
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={8} textAlign="center">
          <Heading size="md">Nenhuma categoria cadastrada</Heading>
        </Box>
      ) : null}

      {!isLoading && !loadError && categories.length > 0 ? (
        <TableContainer bg="white" border="1px solid" borderColor="gray.200" borderRadius="md">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Nome</Th>
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
                <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
                <FormErrorMessage>{editErrors.name}</FormErrorMessage>
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
