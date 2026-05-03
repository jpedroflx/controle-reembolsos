import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Link as ChakraLink,
  Stack,
  Text
} from "@chakra-ui/react";
import { FormEvent, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { api } from "../api/http";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

type RegisterFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

function validateRegisterForm(name: string, email: string, password: string) {
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

  return nextErrors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextErrors = validateRegisterForm(name, email, password);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/users", {
        name: name.trim(),
        email: email.trim(),
        password
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
      <Container maxW="md" py={{ base: 8, md: 14 }}>
        <Stack mb={6} spacing={1} textAlign="center">
          <Heading size="lg">Controle de Reembolsos</Heading>
          <Text color="gray.600">Crie um usuario colaborador</Text>
        </Stack>

        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" p={{ base: 5, md: 6 }}>
          <Box as="form" noValidate onSubmit={handleSubmit}>
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
                <Input
                  autoComplete="name"
                  focusBorderColor="red.500"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <FormErrorMessage>{fieldErrors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(fieldErrors.email)} isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  autoComplete="email"
                  focusBorderColor="red.500"
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
                  focusBorderColor="red.500"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <FormErrorMessage>{fieldErrors.password}</FormErrorMessage>
              </FormControl>

              <Box>
                <Text color="gray.500" fontSize="sm" mb={2}>
                  Perfil criado
                </Text>
                <Badge colorScheme="green" px={2} py={1} rounded="full">
                  COLABORADOR
                </Badge>
              </Box>

              <Button isLoading={isLoading} type="submit">
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
