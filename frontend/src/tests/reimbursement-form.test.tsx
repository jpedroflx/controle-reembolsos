import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReimbursementForm } from "../components/ReimbursementForm";
import type { Category } from "../types/categories";
import { renderWithProviders } from "./test-utils";

const categories: Category[] = [
  {
    active: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    id: "cat-transporte",
    attachmentRequiredAboveAmount: null,
    maxAmount: 50,
    name: "Transporte",
    updatedAt: "2026-05-01T00:00:00.000Z"
  }
];

function getTodayDateInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFutureDateInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

describe("ReimbursementForm", () => {
  it("validates required fields", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ReimbursementForm
        categories={categories}
        isSubmitting={false}
        submitLabel="Criar solicitacao"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole("button", { name: /criar solicitacao/i }));

    expect(await screen.findByText("Informe a descricao.")).toBeInTheDocument();
    expect(screen.getByText("Selecione uma categoria ativa.")).toBeInTheDocument();
    expect(screen.getByText("Informe o valor.")).toBeInTheDocument();
    expect(screen.getByText("Informe a data da despesa.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires amount to be greater than zero", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ReimbursementForm
        categories={categories}
        isSubmitting={false}
        submitLabel="Criar solicitacao"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/descricao/i), "Taxi para cliente");
    await user.selectOptions(screen.getByLabelText(/categoria/i), "cat-transporte");
    await user.type(screen.getByLabelText(/valor/i), "0");
    await user.type(screen.getByLabelText(/data da despesa/i), "2026-05-01");
    await user.click(screen.getByRole("button", { name: /criar solicitacao/i }));

    expect(await screen.findByText("O valor deve ser maior que zero.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows and validates the selected category limit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ReimbursementForm
        categories={categories}
        isSubmitting={false}
        submitLabel="Criar solicitacao"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/descricao/i), "Taxi para cliente");
    await user.selectOptions(screen.getByLabelText(/categoria/i), "cat-transporte");
    await user.type(screen.getByLabelText(/valor/i), "60");
    await user.type(screen.getByLabelText(/data da despesa/i), getTodayDateInputValue());
    await user.click(screen.getByRole("button", { name: /criar solicitacao/i }));

    expect(screen.getByText(/Limite da categoria:/i)).toBeInTheDocument();
    expect(await screen.findByText(/O valor excede o limite da categoria/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks future expense dates", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ReimbursementForm
        categories={categories}
        isSubmitting={false}
        submitLabel="Criar solicitacao"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/descricao/i), "Taxi para cliente");
    await user.selectOptions(screen.getByLabelText(/categoria/i), "cat-transporte");
    await user.type(screen.getByLabelText(/valor/i), "25");
    await user.type(screen.getByLabelText(/data da despesa/i), getFutureDateInputValue());
    await user.click(screen.getByRole("button", { name: /criar solicitacao/i }));

    expect(await screen.findByText("A data da despesa nao pode ser futura.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
