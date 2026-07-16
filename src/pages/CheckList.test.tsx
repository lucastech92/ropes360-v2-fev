import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckList from "./CheckList";

const testState = vi.hoisted(() => ({
  setSelectedChecklist: vi.fn(),
  toast: vi.fn(),
}));

const serviceChecklist = {
  id: "checklist-service",
  name: "Checklist do JBR",
  description: "Saída",
  service_tag: "JBR-900",
  checklist_type: "saida" as const,
  is_template: false,
  is_saved: false,
  saved_at: null,
};

const templateChecklist = {
  ...serviceChecklist,
  id: "checklist-template",
  name: "Template 900cc",
  service_tag: null,
  is_template: true,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: testState.toast }),
}));

vi.mock("@/hooks/useChecklistData", () => ({
  useChecklistData: () => ({
    checklists: [serviceChecklist, templateChecklist],
    selectedChecklist: serviceChecklist.id,
    setSelectedChecklist: testState.setSelectedChecklist,
    items: [],
    inventoryItems: [],
    templates: [templateChecklist],
    serviceChecklists: [serviceChecklist],
    savedChecklists: [],
    currentChecklist: serviceChecklist,
    completedCount: 0,
    totalCount: 0,
    progress: 0,
    updateItemQuantity: vi.fn(),
    addItem: vi.fn(),
    deleteItem: vi.fn(),
    createChecklist: vi.fn(),
    updateChecklist: vi.fn(),
    cloneTemplate: vi.fn(),
    saveChecklist: vi.fn(),
    restoreChecklist: vi.fn(),
    saveAsTemplate: vi.fn(),
  }),
}));

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/checklist/ChecklistSelector", () => ({
  ChecklistSelector: ({ onEditClick }: { onEditClick: () => void }) => (
    <button onClick={onEditClick}>Editar checklist selecionado</button>
  ),
}));
vi.mock("@/components/checklist/ChecklistDetails", () => ({ ChecklistDetails: () => null }));
vi.mock("@/components/checklist/TemplatesTab", () => ({
  TemplatesTab: ({ templates, onEditClick }: { templates: (typeof templateChecklist)[]; onEditClick: (template: typeof templateChecklist) => void }) => (
    <button onClick={() => onEditClick(templates[0])}>Editar template de teste</button>
  ),
}));
vi.mock("@/components/checklist/SavedChecklistsTab", () => ({ SavedChecklistsTab: () => null }));
vi.mock("@/components/checklist/ChecklistCloneDialog", () => ({ ChecklistCloneDialog: () => null }));
vi.mock("@/components/checklist/ChecklistFormDialog", () => ({
  ChecklistFormDialog: ({ open, mode, isTemplate, name }: { open: boolean; mode: string; isTemplate: boolean; name: string }) =>
    open ? <div role="dialog">{mode}:{isTemplate ? "template" : "checklist"}:{name}</div> : null,
}));

vi.mock("@/integrations/supabase/client", () => {
  const serviceLinksQuery: Record<string, unknown> = {};
  serviceLinksQuery.select = vi.fn(() => serviceLinksQuery);
  serviceLinksQuery.eq = vi.fn(() => serviceLinksQuery);
  serviceLinksQuery.limit = vi.fn(() => serviceLinksQuery);
  serviceLinksQuery.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: [{ service_id: "service-1" }], error: null }).then(resolve);

  const servicesQuery: Record<string, unknown> = {};
  servicesQuery.select = vi.fn(() => servicesQuery);
  servicesQuery.eq = vi.fn(() => servicesQuery);
  servicesQuery.single = vi.fn(async () => ({ data: { logistics_container_id: null }, error: null }));

  return {
    supabase: {
      from: vi.fn((table: string) => table === "service_checklists" ? serviceLinksQuery : servicesQuery),
    },
  };
});

const renderPage = () => render(
  <MemoryRouter
    initialEntries={["/checklist?serviceId=service-1"]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <CheckList />
  </MemoryRouter>,
);

describe("CheckList edit flow", () => {
  beforeEach(() => testState.setSelectedChecklist.mockClear());

  it("abre imediatamente o formulário do checklist selecionado", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Editar checklist selecionado" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("edit:checklist:Checklist do JBR");
  });

  it("abre o formulário correto ao editar um template", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /Templates/ }));
    await user.click(screen.getByRole("button", { name: "Editar template de teste" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("edit:template:Template 900cc");
    expect(testState.setSelectedChecklist).toHaveBeenCalledWith(templateChecklist.id);
  });
});
