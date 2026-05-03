import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  FormControl,
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

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export function LoginPage() {
  const { setSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@teste.com");
  const [password, setPassword] = useState("Senha@123");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        email,
        password
      });

      setSession(response.data);
      navigate((location.state as { from?: string } | null)?.from ?? "/dashboard", { replace: true });
    } catch {
      setError("Não foi possível autenticar com as credenciais informadas.");
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
                <Text color="gray.600">Entre para acessar as rotas privadas.</Text>
              </Stack>

              {error ? (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Senha</FormLabel>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </FormControl>

              <Button colorScheme="red" isLoading={isLoading} type="submit">
                Entrar
              </Button>

              <Text color="gray.600" fontSize="sm">
                Ainda não tem conta?{" "}
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
