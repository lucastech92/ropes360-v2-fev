// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(resolve(process.cwd(), "supabase", "migrations", name), "utf8");

describe("critical JBR -> checklist -> inventory SQL contract", () => {
  const duplicateProtection = readMigration("20260716163500_prevent_duplicate_service_checklists.sql");
  const immediateDeduction = readMigration("20260717103000_simplify_jbr_inventory_immediate_deduction.sql");

  it("baixa o estoque ao vincular um checklist de saída ao JBR", () => {
    expect(immediateDeduction).toMatch(/AFTER INSERT ON public\.service_checklists/);
    expect(immediateDeduction).toMatch(/apply_service_checklist_item_stock/);
    expect(immediateDeduction).toMatch(/v_new_quantity := v_previous_quantity - p_quantity/);
    expect(immediateDeduction).toMatch(/UPDATE public\.inventory[\s\S]*?SET quantity = v_new_quantity/);
  });

  it("usa a quantidade planejada e impede saldo negativo", () => {
    expect(immediateDeduction).toMatch(/ci\.target_quantity/);
    expect(immediateDeduction).toMatch(/c\.checklist_type = 'saida'/);
    expect(immediateDeduction).toMatch(/FROM public\.inventory[\s\S]*?FOR UPDATE;/);
    expect(immediateDeduction).toMatch(/IF v_previous_quantity < p_quantity THEN/);
    expect(immediateDeduction).toContain("Insufficient stock for inventory item");
  });

  it("registra a fotografia e o movimento auditável na baixa imediata", () => {
    expect(immediateDeduction).toMatch(/INSERT INTO public\.service_dispatch_items/);
    expect(immediateDeduction).toMatch(/INSERT INTO public\.service_inventory_movements/);
    expect(immediateDeduction).toMatch(/p_service_id, p_inventory_item_id, 'dispatch', p_quantity/);
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
