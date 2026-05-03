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
  Select,
  Stack,
  Text
} from "@chakra-ui/react";
import { FormEvent, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { api } from "../api/http";
import { UserRole } from "../contexts/AuthContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Senha@123");
  const [role, setRole] = useState<UserRole>("COLABORADOR");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post("/users", {
        name,
        email,
        password,
        role
      });
      navigate("/login", { replace: true });
    } catch {
      setError("Não foi possível criar o usuário.");
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
                <Text color="gray.600">Crie um usuário para testar os fluxos por perfil.</Text>
              </Stack>

              {error ? (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Senha</FormLabel>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Perfil</FormLabel>
                <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                  <option value="COLABORADOR">COLABORADOR</option>
                  <option value="GESTOR">GESTOR</option>
                  <option value="FINANCEIRO">FINANCEIRO</option>
                  <option value="ADMIN">ADMIN</option>
                </Select>
              </FormControl>

              <Button colorScheme="red" isLoading={isLoading} type="submit">
                Criar usuário
              </Button>

              <Text color="gray.600" fontSize="sm">
                Já tem conta?{" "}
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
