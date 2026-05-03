import {
  Badge,
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

import { useAuth, type UserRole } from "../contexts/AuthContext";

type NavigationItem = {
  allowedRoles?: UserRole[];
  label: string;
  to: string;
};

const navigationItems: NavigationItem[] = [
  { label: "Dashboard", to: "/dashboard" },
  { allowedRoles: ["COLABORADOR"], label: "Nova solicitacao", to: "/reimbursements/new" },
  { allowedRoles: ["ADMIN"], label: "Categorias", to: "/categories" }
];

export function AppLayout() {
  const { clearSession, user, userRole } = useAuth();
  const navigate = useNavigate();
  const visibleNavigationItems = navigationItems.filter(
    (item) => !item.allowedRoles || (userRole && item.allowedRoles.includes(userRole))
  );

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" borderBottom="1px solid" borderColor="gray.200" position="sticky" top={0} zIndex="sticky">
        <Container maxW="7xl" py={4}>
          <Flex align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} justify="space-between">
            <Stack spacing={0}>
              <Text color="gray.900" fontSize="lg" fontWeight="bold">
                Controle de Reembolsos
              </Text>
              <HStack color="gray.500" fontSize="sm" spacing={2}>
                <Text>{user ? user.name : "Usuario autenticado"}</Text>
                {userRole ? (
                  <Badge colorScheme="red" rounded="full">
                    {userRole}
                  </Badge>
                ) : null}
              </HStack>
            </Stack>

            <HStack
              as="nav"
              bg={{ base: "gray.50", md: "transparent" }}
              borderRadius="md"
              overflowX="auto"
              px={{ base: 3, md: 0 }}
              py={{ base: 2, md: 0 }}
              spacing={4}
              whiteSpace="nowrap"
            >
              {visibleNavigationItems.map((item) => (
                <ChakraLink
                  as={RouterLink}
                  color="gray.700"
                  fontSize="sm"
                  fontWeight="semibold"
                  key={item.to}
                  to={item.to}
                >
                  {item.label}
                </ChakraLink>
              ))}
            </HStack>

            <Button alignSelf={{ base: "flex-start", md: "center" }} size="sm" variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" py={{ base: 5, md: 8 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
