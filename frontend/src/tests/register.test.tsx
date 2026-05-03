import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/http";
import { RegisterPage } from "../pages/RegisterPage";
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

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits public registration without allowing role selection", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        email: "novo@teste.com",
        id: "user-novo",
        name: "Novo Usuario",
        role: "COLABORADOR"
      }
    });

    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: "/register" });

    expect(screen.queryByLabelText(/perfil/i)).not.toBeInTheDocument();
    expect(screen.getByText("COLABORADOR")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/nome/i), "Novo Usuario");
    await user.type(screen.getByLabelText(/email/i), "novo@teste.com");
    await user.type(screen.getByLabelText(/senha/i), "Senha@123");
    await user.click(screen.getByRole("button", { name: /criar usuario/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/users", {
        email: "novo@teste.com",
        name: "Novo Usuario",
        password: "Senha@123"
      });
    });
  });
});
