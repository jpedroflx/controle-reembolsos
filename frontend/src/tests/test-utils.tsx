import { ChakraProvider } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider, type AuthSession, type UserRole } from "../contexts/AuthContext";
import { theme } from "../theme";

const STORAGE_KEY = "controle-reembolsos:session";

type RenderOptions = {
  route?: string;
  session?: AuthSession | null;
};

export function createAuthSession(role: UserRole): AuthSession {
  return {
    token: `token-${role.toLowerCase()}`,
    user: {
      email: `${role.toLowerCase()}@teste.com`,
      id: role === "COLABORADOR" ? "user-colaborador" : `user-${role.toLowerCase()}`,
      name: `Usuario ${role}`,
      role
    }
  };
}

export function renderWithProviders(ui: ReactElement, { route = "/", session }: RenderOptions = {}) {
  window.localStorage.clear();

  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  return render(
    <ChakraProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </ChakraProvider>
  );
}
