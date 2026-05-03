import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Link as ChakraLink,
  Select,
  Stack,
  Text
} from "@chakra-ui/react";
import { FormEvent, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { api } from "../api/http";
import { UserRole } from "../contexts/AuthContext";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

type RegisterFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
};

const allowedRoles: UserRole[] = ["COLABORADOR", "GESTOR", "FINANCEIRO", "ADMIN"];

function isUserRole(value: string): value is UserRole {
  return allowedRoles.includes(value as UserRole);
}

function validateRegisterForm(name: string, email: string, password: string, role: string) {
  const nextErrors: RegisterFieldErrors = {};
  const normalizedName = name.trim();
  const normalizedEmail = email.trim();

  if (!normalizedName) {
    nextErrors.name = "Informe o nome.";
  }

  if (!normalizedEmail) {
    nextErrors.email = "Informe o email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    nextErrors.email = "Informe um email valido.";
  }

  if (!password) {
    nextErrors.password = "Informe a senha.";
  } else if (password.length < 6) {
    nextErrors.password = "A senha deve ter pelo menos 6 caracteres.";
  }

  if (!role) {
    nextErrors.role = "Selecione um perfil.";
  } else if (!isUserRole(role)) {
    nextErrors.role = "Selecione um perfil valido.";
  }

  return nextErrors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("COLABORADOR");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextErrors = validateRegisterForm(name, email, password, role);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/users", {
        name: name.trim(),
        email: email.trim(),
        password,
        role
      });
      navigate("/login", {
        replace: true,
        state: { message: "Cadastro realizado. Faca login para continuar." }
      });
    } catch (caughtError) {
      const status = getApiErrorStatus(caughtError);

      if (status === 400) {
        setError(getApiErrorMessage(caughtError, "Confira os dados informados."));
        return;
      }

      setError(getApiErrorMessage(caughtError, "Nao foi possivel criar o usuario agora. Tente novamente."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="md" py={12}>
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={6}>
          <Box as="form" onSubmit={handleSubmit}>
            <Stack spacing={5}>
              <Stack spacing={1}>
                <Heading size="lg">Cadastro</Heading>
                <Text color="gray.600">Crie seu acesso.</Text>
              </Stack>

              {error ? (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <FormControl isInvalid={Boolean(fieldErrors.name)} isRequired>
                <FormLabel>Nome</FormLabel>
                <Input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
                <FormErrorMessage>{fieldErrors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(fieldErrors.email)} isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <FormErrorMessage>{fieldErrors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(fieldErrors.password)} isRequired>
                <FormLabel>Senha</FormLabel>
                <Input
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <FormErrorMessage>{fieldErrors.password}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(fieldErrors.role)} isRequired>
                <FormLabel>Perfil</FormLabel>
                <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                  {allowedRoles.map((allowedRole) => (
                    <option key={allowedRole} value={allowedRole}>
                      {allowedRole}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{fieldErrors.role}</FormErrorMessage>
              </FormControl>

              <Button colorScheme="red" isLoading={isLoading} type="submit">
                Criar usuario
              </Button>

              <Text color="gray.600" fontSize="sm">
                Ja tem conta?{" "}
                <ChakraLink as={RouterLink} color="red.600" fontWeight="semibold" to="/login">
                  Entrar
                </ChakraLink>
              </Text>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
