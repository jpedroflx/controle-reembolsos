import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Link as ChakraLink,
  Stack,
  Text
} from "@chakra-ui/react";
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

const navigationItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Nova solicitação", to: "/reimbursements/new" },
  { label: "Categorias", to: "/categories" }
];

export function AppLayout() {
  const { clearSession, user, userRole } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" borderBottom="1px solid" borderColor="gray.200">
        <Container maxW="6xl" py={4}>
          <Flex align="center" gap={4} justify="space-between">
            <Stack spacing={0}>
              <Text color="gray.900" fontSize="lg" fontWeight="bold">
                Controle de Reembolsos
              </Text>
              <Text color="gray.500" fontSize="sm">
                {user ? `${user.name} (${userRole})` : "Usuário autenticado"}
              </Text>
            </Stack>

            <HStack as="nav" display={{ base: "none", md: "flex" }} spacing={4}>
              {navigationItems.map((item) => (
                <ChakraLink as={RouterLink} color="gray.700" fontWeight="medium" key={item.to} to={item.to}>
                  {item.label}
                </ChakraLink>
              ))}
            </HStack>

            <Button colorScheme="red" variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </Flex>
        </Container>
      </Box>

      <Container maxW="6xl" py={8}>
        <Outlet />
      </Container>
    </Box>
  );
}
