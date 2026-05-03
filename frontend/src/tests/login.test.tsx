import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { api } from "../api/http";
import { LoginPage } from "../pages/LoginPage";
import { renderWithProviders } from "./test-utils";

vi.mock("../api/http", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  },
  setAuthToken: vi.fn()
}));

const mockedApi = api as unknown as {
  post: Mock;
};

describe("LoginPage", () => {
  it("renders the login form", () => {
    renderWithProviders(<LoginPage />, { route: "/login" });

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("shows a clear message when credentials are invalid", async () => {
    mockedApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: { message: "Invalid email or password" },
        status: 401
      }
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: "/login" });

    await user.type(screen.getByLabelText(/email/i), "admin@teste.com");
    await user.type(screen.getByLabelText(/senha/i), "senha-incorreta");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Email ou senha invalidos.")).toBeInTheDocument();
  });
});
