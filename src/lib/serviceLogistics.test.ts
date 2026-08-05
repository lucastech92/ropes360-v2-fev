import { describe, expect, it } from "vitest";
import { getReleaseDisabledReason } from "./serviceLogistics";

const readyState = {
  releasedAt: null,
  loading: false,
  canManage: true,
  linkedChecklistCount: 1,
  containerId: "container-1",
};

describe("getReleaseDisabledReason", () => {
  it("informa quando o JBR já foi liberado", () => {
    expect(getReleaseDisabledReason({ ...readyState, releasedAt: "2026-08-05T12:00:00Z" }))
      .toBe("JBR já liberado.");
  });

  it("informa quando o usuário não tem permissão", () => {
    expect(getReleaseDisabledReason({ ...readyState, canManage: false }))
      .toBe("Sem permissão para liberar.");
  });

  it("informa quando não há checklist vinculado", () => {
    expect(getReleaseDisabledReason({ ...readyState, linkedChecklistCount: 0 }))
      .toBe("Nenhum checklist vinculado.");
  });

  it("informa quando falta selecionar o container", () => {
    expect(getReleaseDisabledReason({ ...readyState, containerId: null }))
      .toBe("Selecione um container.");
  });

  it("habilita a liberação quando todos os requisitos foram atendidos", () => {
    expect(getReleaseDisabledReason(readyState)).toBeNull();
  });
});
