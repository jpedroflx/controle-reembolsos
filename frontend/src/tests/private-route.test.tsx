import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppRoutes } from "../routes/AppRoutes";
import { renderWithProviders } from "./test-utils";

vi.mock("../api/http", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  },
  setAuthToken: vi.fn()
}));

describe("private routes", () => {
  it("redirects unauthenticated users to login", () => {
    renderWithProviders(<AppRoutes />, { route: "/dashboard" });

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText("Acesse sua conta.")).toBeInTheDocument();
  });
});
