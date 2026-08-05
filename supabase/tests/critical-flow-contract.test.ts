// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(resolve(process.cwd(), "supabase", "migrations", name), "utf8");

describe("critical JBR -> checklist -> inventory SQL contract", () => {
  const duplicateProtection = readMigration("20260716163500_prevent_duplicate_service_checklists.sql");
  const immediateDeduction = readMigration("20260717103000_simplify_jbr_inventory_immediate_deduction.sql");
  const selectionDeduction = readMigration("20260805150000_deduct_inventory_on_checklist_selection.sql");

  it("baixa o estoque somente ao selecionar quantidade no checklist", () => {
    expect(selectionDeduction).toMatch(/AFTER INSERT OR UPDATE OF current_quantity, inventory_item_id/);
    expect(selectionDeduction).toMatch(/sync_service_checklist_item_stock/);
    expect(selectionDeduction).toMatch(/v_delta := v_desired_quantity - v_existing_quantity/);
    expect(selectionDeduction).toMatch(/v_new_quantity := v_previous_quantity - v_delta/);
    expect(selectionDeduction).toMatch(/UPDATE public\.inventory[\s\S]*?SET quantity = v_new_quantity/);
  });

  it("usa current_quantity e impede saldo negativo", () => {
    expect(selectionDeduction).toMatch(/ci\.current_quantity/);
    expect(selectionDeduction).toMatch(/c\.checklist_type = 'saida'/);
    expect(selectionDeduction).toMatch(/FROM public\.inventory[\s\S]*?FOR UPDATE;/);
    expect(selectionDeduction).toMatch(/IF v_previous_quantity < v_delta THEN/);
    expect(selectionDeduction).toContain("Insufficient stock for inventory item");
  });

  it("registra a fotografia e cada diferença selecionada", () => {
    expect(selectionDeduction).toMatch(/INSERT INTO public\.service_dispatch_items/);
    expect(selectionDeduction).toMatch(/INSERT INTO public\.service_inventory_movements/);
    expect(selectionDeduction).toMatch(/p_service_id, p_inventory_item_id, 'dispatch', v_delta/);
    expect(selectionDeduction).toContain("Baixa automática ao selecionar quantidade no checklist");
  });

  it("impede reutilizar o mesmo template no mesmo JBR", () => {
    expect(duplicateProtection).toMatch(/ADD COLUMN IF NOT EXISTS source_template_id uuid/);
    expect(duplicateProtection).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS service_checklists_service_template_unique/);
    expect(duplicateProtection).toMatch(/ON public\.service_checklists\(service_id, source_template_id\)/);
    expect(duplicateProtection).toMatch(/WHERE source_template_id IS NOT NULL/);
  });

  it("devolve o estoque ao remover checklist ou item antes da liberação", () => {
    expect(immediateDeduction).toMatch(/BEFORE DELETE ON public\.service_checklists/);
    expect(immediateDeduction).toMatch(/BEFORE DELETE ON public\.checklist_items/);
    expect(immediateDeduction).toMatch(/v_new_quantity := COALESCE\(v_inventory\.quantity, 0\) \+ v_dispatch\.dispatched_quantity/);
    expect(immediateDeduction).toContain("Estorno automático ao remover checklist do JBR");
    expect(selectionDeduction).toContain("Estorno automático ao reduzir quantidade no checklist");
  });

  it("mantém a disponibilidade igual ao saldo físico, sem reserva", () => {
    expect(immediateDeduction).toMatch(/CREATE OR REPLACE VIEW public\.inventory_stock_availability/);
    expect(immediateDeduction).toMatch(/0::integer AS reserved_quantity/);
    expect(immediateDeduction).toMatch(/COALESCE\(i\.quantity, 0\)::integer AS available_quantity/);
    expect(immediateDeduction).toMatch(/CREATE OR REPLACE FUNCTION public\.get_inventory_stock_availability/);
  });

  it("libera o JBR sem realizar uma segunda baixa", () => {
    const releaseFunction = immediateDeduction.match(
      /CREATE OR REPLACE FUNCTION public\.release_service_logistics[\s\S]*?GRANT SELECT ON public\.service_inventory_reservations/,
    )?.[0] ?? "";
    expect(releaseFunction).toContain("logistics_released_at = COALESCE(logistics_released_at, now())");
    expect(releaseFunction).not.toMatch(/UPDATE public\.inventory/);
    expect(releaseFunction).toMatch(/has_role\(auth\.uid\(\), 'inspector'\)/);
  });
});
