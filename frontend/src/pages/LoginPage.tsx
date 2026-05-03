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
  Stack,
  Text
} from "@chakra-ui/react";
import { FormEvent, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { api } from "../api/http";
import { AuthUser, useAuth } from "../contexts/AuthContext";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

type LocationState = {
  from?: string;
  message?: string;
};

function validateLoginForm(email: string, password: string) {
  const nextErrors: LoginFieldErrors = {};
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    nextErrors.email = "Informe o email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    nextErrors.email = "Informe um email valido.";
  }

  if (!password) {
    nextErrors.password = "Informe a senha.";
  }

  return nextErrors;
}

export function LoginPage() {
  const { setSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as LocationState | null;
  const [infoMessage, setInfoMessage] = useState(locationState?.message ?? null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfoMessage(null);

    const nextErrors = validateLoginForm(email, password);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        email: email.trim(),
        password
      });

      setSession(response.data);
      navigate(locationState?.from ?? "/dashboard", { replace: true });
    } catch (caughtError) {
      const status = getApiErrorStatus(caughtError);

      if (status === 401) {
        setError("Email ou senha invalidos.");
        return;
      }

      if (status === 400) {
        setError("Confira o email e a senha informados.");
        return;
      }

      setError(getApiErrorMessage(caughtError, "Nao foi possivel autenticar agora. Tente novamente."));
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
                <Heading size="lg">Login</Heading>
                <Text color="gray.600">Acesse sua conta.</Text>
              </Stack>

              {infoMessage ? (
                <Alert status="info">
                  <AlertIcon />
                  {infoMessage}
                </Alert>
              ) : null}

              {error ? (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <FormControl isInvalid={Boolean(fieldErrors.email)} isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setInfoMessage(null);
                  }}
                />
                <FormErrorMessage>{fieldErrors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(fieldErrors.password)} isRequired>
                <FormLabel>Senha</FormLabel>
                <Input
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setInfoMessage(null);
                  }}
                />
                <FormErrorMessage>{fieldErrors.password}</FormErrorMessage>
              </FormControl>

              <Button colorScheme="red" isLoading={isLoading} type="submit">
                Entrar
              </Button>

              <Text color="gray.600" fontSize="sm">
                Ainda nao tem conta?{" "}
                <ChakraLink as={RouterLink} color="red.600" fontWeight="semibold" to="/register">
                  Cadastre-se
                </ChakraLink>
              </Text>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
