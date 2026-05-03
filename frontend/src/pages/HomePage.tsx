import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";

import { api } from "../api/http";
import { useAuth } from "../contexts/AuthContext";

export function HomePage() {
  const { clearSession, isAuthenticated, user } = useAuth();

  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="5xl" py={{ base: 8, md: 12 }}>
        <Stack spacing={8}>
          <HStack align="flex-start" justify="space-between" spacing={6}>
            <Stack spacing={2}>
              <Badge alignSelf="flex-start" colorScheme="red">
                Projeto inicial
              </Badge>
              <Heading color="gray.900" size="xl">
                Controle de Reembolsos
              </Heading>
              <Text color="gray.600" maxW="2xl">
                Base fullstack pronta para receber as regras do desafio.
              </Text>
            </Stack>

            {isAuthenticated ? (
              <Button colorScheme="red" variant="outline" onClick={clearSession}>
                Sair
              </Button>
            ) : null}
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <StatusCard label="Frontend" value="Vite + React" />
            <StatusCard label="API configurada" value={api.defaults.baseURL ?? "http://localhost:3333"} />
            <StatusCard label="Sessão" value={user ? `${user.nome} (${user.perfil})` : "Não autenticado"} />
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
};

function StatusCard({ label, value }: StatusCardProps) {
  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={5}>
      <Text color="gray.500" fontSize="sm" fontWeight="medium">
        {label}
      </Text>
      <Text color="gray.900" fontSize="lg" fontWeight="semibold" mt={2}>
        {value}
      </Text>
    </Box>
  );
}
