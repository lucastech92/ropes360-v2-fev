interface ReleaseAvailabilityInput {
  releasedAt: string | null;
  loading: boolean;
  canManage: boolean;
  linkedChecklistCount: number;
  containerId: string | null;
}

export const getReleaseDisabledReason = ({
  releasedAt,
  loading,
  canManage,
  linkedChecklistCount,
  containerId,
}: ReleaseAvailabilityInput): string | null => {
  if (releasedAt) return "JBR já liberado.";
  if (loading) return "Carregando dados do JBR.";
  if (!canManage) return "Sem permissão para liberar.";
  if (linkedChecklistCount === 0) return "Nenhum checklist vinculado.";
  if (!containerId) return "Selecione um container.";
  return null;
};
