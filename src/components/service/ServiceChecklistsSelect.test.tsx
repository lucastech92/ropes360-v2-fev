import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceChecklistsSelect } from "./ServiceChecklistsSelect";

const supabaseMock = vi.hoisted(() => ({
  response: { data: [] as unknown[], error: null as unknown },
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const query: Record<string, unknown> = {};
  query.select = supabaseMock.select.mockImplementation(() => query);
  query.order = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(supabaseMock.response).then(resolve, reject);
  supabaseMock.from.mockImplementation(() => query);

  return { supabase: { from: supabaseMock.from } };
});

const template = {
  id: "template-1",
  name: "Check 900cc",
  description: "Wirelock",
  checklist_type: "saida",
  is_template: true,
  service_checklists: [],
};

describe("ServiceChecklistsSelect", () => {
  beforeEach(() => {
    supabaseMock.response = { data: [template], error: null };
  });

  it("usa a chave estrangeira correta e exibe os templates", async () => {
    render(
      <ServiceChecklistsSelect
        selectedChecklistIds={[]}
        onChange={vi.fn()}
        mode="available"
      />,
    );

    expect(await screen.findByText("Check 900cc")).toBeInTheDocument();
    expect(supabaseMock.select).toHaveBeenCalledWith(
      expect.stringContaining("service_checklists!service_checklists_checklist_id_fkey(service_id)"),
    );
  });

  it("bloqueia um template que já foi usado no JBR", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ServiceChecklistsSelect
        selectedChecklistIds={[]}
        onChange={onChange}
        mode="available"
        disabledChecklistIds={[template.id]}
      />,
    );

    await user.click(await screen.findByText("Check 900cc"));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Já adicionado a este JBR")).toBeInTheDocument();
  });

  it("permite selecionar um template disponível", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ServiceChecklistsSelect
        selectedChecklistIds={[]}
        onChange={onChange}
        mode="available"
      />,
    );

    await user.click(await screen.findByText("Check 900cc"));
    expect(onChange).toHaveBeenCalledWith([template.id]);
  });

  it("mostra erro de carregamento em vez de uma lista vazia", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    supabaseMock.response = { data: [], error: { message: "ambiguous relationship" } };

    render(
      <ServiceChecklistsSelect
        selectedChecklistIds={[]}
        onChange={vi.fn()}
        mode="available"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Não foi possível carregar os checklists. Tente novamente.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Nenhum template ou checklist sem JBR disponível.")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});
