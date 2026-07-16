// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(resolve(process.cwd(), "supabase", "migrations", name), "utf8");

describe("critical JBR -> checklist -> inventory SQL contract", () => {
  const inventoryLifecycle = readMigration("20260711010000_integrate_jbr_inventory_lifecycle.sql");
  const duplicateProtection = readMigration("20260716163500_prevent_duplicate_service_checklists.sql");
  const stockReservations = readMigration("20260716190000_add_inventory_stock_reservations.sql");

  it("mantém a liberação logística idempotente", () => {
    expect(inventoryLifecycle).toMatch(/IF v_service\.logistics_inventory_dispatched_at IS NULL THEN/);
    expect(inventoryLifecycle).toMatch(/ON CONFLICT \(service_id, source_checklist_item_id\) DO NOTHING/);
    expect(inventoryLifecycle).toMatch(/logistics_inventory_dispatched_at = COALESCE\(logistics_inventory_dispatched_at, now\(\)\)/);
  });

  it("agrega as quantidades de saída por item e trava o saldo antes da baixa", () => {
    expect(inventoryLifecycle).toMatch(/SUM\(COALESCE\(ci\.current_quantity, 0\)\)::integer AS dispatched_quantity/);
    expect(inventoryLifecycle).toMatch(/c\.checklist_type = 'saida'/);
    expect(inventoryLifecycle).toMatch(/FROM public\.inventory[\s\S]*?FOR UPDATE;/);
    expect(inventoryLifecycle).toMatch(/IF v_previous_quantity < v_resource\.dispatched_quantity THEN/);
    expect(inventoryLifecycle).toContain("Insufficient stock for inventory item");
  });

  it("baixa o estoque e registra um movimento auditável", () => {
    expect(inventoryLifecycle).toMatch(/v_new_quantity := v_previous_quantity - v_resource\.dispatched_quantity/);
    expect(inventoryLifecycle).toMatch(/UPDATE public\.inventory[\s\S]*?SET quantity = v_new_quantity/);
    expect(inventoryLifecycle).toMatch(/INSERT INTO public\.service_inventory_movements/);
    expect(inventoryLifecycle).toMatch(/'dispatch', v_resource\.dispatched_quantity/);
  });

  it("impede reutilizar o mesmo template no mesmo JBR", () => {
    expect(duplicateProtection).toMatch(/ADD COLUMN IF NOT EXISTS source_template_id uuid/);
    expect(duplicateProtection).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS service_checklists_service_template_unique/);
    expect(duplicateProtection).toMatch(/ON public\.service_checklists\(service_id, source_template_id\)/);
    expect(duplicateProtection).toMatch(/WHERE source_template_id IS NOT NULL/);
  });

  it("reserva a quantidade planejada sem alterar o saldo físico", () => {
    expect(stockReservations).toMatch(/CREATE OR REPLACE VIEW public\.service_inventory_reservations/);
    expect(stockReservations).toMatch(/SUM\(GREATEST\(COALESCE\(ci\.target_quantity, 0\), 0\)\)/);
    expect(stockReservations).toMatch(/s\.logistics_inventory_dispatched_at IS NULL/);
    expect(stockReservations).not.toMatch(/UPDATE public\.inventory\s+SET quantity/);
  });

  it("calcula físico, reservado e disponível por item", () => {
    expect(stockReservations).toMatch(/CREATE OR REPLACE VIEW public\.inventory_stock_availability/);
    expect(stockReservations).toMatch(/AS physical_quantity/);
    expect(stockReservations).toMatch(/AS reserved_quantity/);
    expect(stockReservations).toMatch(/AS available_quantity/);
    expect(stockReservations).toMatch(/CREATE OR REPLACE FUNCTION public\.get_inventory_stock_availability/);
  });

  it("bloqueia uma nova reserva quando outro JBR já comprometeu o saldo", () => {
    expect(stockReservations).toMatch(/CREATE OR REPLACE FUNCTION public\.assert_inventory_reservation_capacity/);
    expect(stockReservations).toMatch(/FOR UPDATE;/);
    expect(stockReservations).toContain("Insufficient available stock");
    expect(stockReservations).toMatch(/BEFORE INSERT OR UPDATE OF checklist_id, inventory_item_id, target_quantity/);
    expect(stockReservations).toMatch(/BEFORE INSERT ON public\.service_checklists/);
  });
});
