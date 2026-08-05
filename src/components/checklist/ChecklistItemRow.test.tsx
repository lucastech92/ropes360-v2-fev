import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChecklistItemRow } from "./ChecklistItemRow";

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ canDelete: true }),
}));

const item = {
  id: "item-1",
  item_text: "Wirelock 900cc",
  is_checked: false,
  order_index: 1,
  target_quantity: 4,
  current_quantity: 1,
  inventory_item_id: "inventory-1",
};

describe("ChecklistItemRow", () => {
  it("mostra o saldo atual e permite selecionar uma unidade quando há estoque", async () => {
    const onQuantityChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ChecklistItemRow
        item={item}
        stockQuantity={3}
        stockUnit="un"
        onQuantityChange={onQuantityChange}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Estoque atual")).toBeInTheDocument();
    expect(screen.getByText("3 un")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Adicionar uma unidade ao checklist" }));
    expect(onQuantityChange).toHaveBeenCalledWith(item.id, 1);
  });

  it("bloqueia o botão de adicionar quando o estoque chega a zero", () => {
    render(
      <ChecklistItemRow
        item={item}
        stockQuantity={0}
        stockUnit="un"
        onQuantityChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Sem estoque disponível" })).toBeDisabled();
  });
});
