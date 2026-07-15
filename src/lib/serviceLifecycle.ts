export const SERVICE_PHASES = [
  { value: "planning", label: "Planejamento", description: "JBR criado e escopo definido." },
  { value: "preparation", label: "Preparação", description: "Equipe e recursos em preparação." },
  { value: "logistics", label: "Logística", description: "Container reservado e checklist aprovado para liberação." },
  { value: "field", label: "Em campo", description: "Serviço em execução no cliente." },
  { value: "documentation", label: "Documentação", description: "Documentos técnicos aguardados ou em upload." },
  { value: "technical_review", label: "Revisão técnica", description: "Documentos em validação humana e por IA." },
  { value: "return", label: "Retorno", description: "Conferência de materiais e consumo." },
  { value: "completed", label: "Concluído", description: "JBR fechado e histórico consolidado." },
] as const;

export type ServiceOperationalStatus = typeof SERVICE_PHASES[number]["value"];

export const getServicePhase = (status: string | null | undefined) =>
  SERVICE_PHASES.find((phase) => phase.value === status) ?? SERVICE_PHASES[0];

export const getNextServiceStatus = (status: string | null | undefined): ServiceOperationalStatus | null => {
  const currentIndex = SERVICE_PHASES.findIndex((phase) => phase.value === status);
  return currentIndex >= 0 && currentIndex < SERVICE_PHASES.length - 1
    ? SERVICE_PHASES[currentIndex + 1].value
    : null;
};
