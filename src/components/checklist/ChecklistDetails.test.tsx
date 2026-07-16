import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChecklistDetails } from "./ChecklistDetails";

vi.mock("./AddItemForm", () => ({
  AddItemForm: () => <div data-testid="add-item-form">Adicionar item</div>,
}));

vi.mock("./ChecklistItemRow", () => ({
  ChecklistItemRow: ({ item }: { item: { item_text: string } }) => <div>{item.item_text}</div>,
}));

const checklist = {
  id: "checklist-1",
  name: "Check 900cc",
  description: null,
  service_tag: "JBR-900",
  checklist_type: "saida" as const,
  is_template: false,
  is_saved: false,
  saved_at: null,
};

const item = {
  id: "item-1",
  item_text: "Wirelock 900cc",
  is_checked: false,
  order_index: 1,
  target_quantity: 4,
  current_quantity: 0,
  inventory_item_id: "inventory-1",
};

const baseProps = {
  checklist,
  inventoryItems: [],
  progress: 0,
  completedCount: 0,
  totalCount: 0,
  onQuantityChange: vi.fn(),
  onDeleteItem: vi.fn(),
  onAddItem: vi.fn(async () => true),
  onCloneClick: vi.fn(),
};

describe("ChecklistDetails", () => {
  it("mantém a conclusão desabilitada enquanto não há itens", () => {
    render(
      <ChecklistDetails
        {...baseProps}
        items={[]}
        onFinishClick={vi.fn()}
        finishLabel="Salvar checklist"
      />,
    );

    expect(screen.getByRole("button", { name: "Salvar checklist" })).toBeDisabled();
  });

  it("conclui o checklist com itens sem acionar o arquivamento", async () => {
    const onFinish = vi.fn();
    const onArchive = vi.fn();
    const user = userEvent.setup();

    render(
      <ChecklistDetails
        {...baseProps}
        items={[item]}
        totalCount={1}
        onFinishClick={onFinish}
        finishLabel="Salvar e voltar ao JBR"
        onArchiveClick={onArchive}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Salvar e voltar ao JBR" }));

    expect(onFinish).toHaveBeenCalledOnce();
    expect(onArchive).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Mais ações" })).toBeInTheDocument();
  });

  it("informa que os itens são gravados automaticamente", () => {
    render(
      <ChecklistDetails
        {...baseProps}
        items={[item]}
        totalCount={1}
        onFinishClick={vi.fn()}
      />,
    );

    expect(screen.getByText(/Cada item é gravado automaticamente/)).toBeInTheDocument();
  });
});
