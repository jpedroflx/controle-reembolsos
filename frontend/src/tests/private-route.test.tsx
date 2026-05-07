import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { api } from "../api/http";
import { AppRoutes } from "../routes/AppRoutes";
import { createAuthSession, renderWithProviders } from "./test-utils";

vi.mock("../api/http", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  },
  setAuthCallbacks: vi.fn(),
  setAuthToken: vi.fn()
}));

const mockedApi = api as unknown as {
  post: Mock;
};

describe("private routes", () => {
  it("redirects unauthenticated users to login when refresh fails", async () => {
    mockedApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 401
      }
    });

    renderWithProviders(<AppRoutes />, { route: "/dashboard" });

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText("Acesse sua conta.")).toBeInTheDocument();
  });

  it("restores a private route with a valid refresh token", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        token: "novo-access-token",
        user: {
          email: "admin@teste.com",
          id: "user-admin",
          name: "Usuario ADMIN",
          role: "ADMIN"
        }
      }
    });

    renderWithProviders(<AppRoutes />, { route: "/dashboard" });

    expect(await screen.findByText("Controle de Reembolsos")).toBeInTheDocument();
    expect(screen.getByText("Usuario ADMIN")).toBeInTheDocument();
    expect(mockedApi.post).toHaveBeenCalledWith("/auth/refresh");
  });

  it("logs out through the API and returns to login", async () => {
    mockedApi.post.mockResolvedValueOnce({});
    const user = userEvent.setup();

    renderWithProviders(<AppRoutes />, {
      route: "/dashboard",
      session: createAuthSession("ADMIN")
    });

    await user.click(await screen.findByRole("button", { name: "Sair" }));

    expect(mockedApi.post).toHaveBeenCalledWith("/auth/logout");
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});
