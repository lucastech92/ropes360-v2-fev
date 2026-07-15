export type RopeReviewPriority = "critical" | "review" | "info";

export interface RopeReviewFinding {
  priority: RopeReviewPriority;
  category: "document_control" | "technical_consistency" | "inspection_scope";
  evidence: string;
  recommendation: string;
}

export const ROPE360_ISO4309_PROFILE = [
  "PERFIL TÉCNICO ROPES360 — INSPEÇÃO DE CABOS DE AÇO",
  "",
  "Referência técnica principal: ISO 4309. O parecer deve apoiar o inspetor; não substitui a decisão técnica humana.",
  "Classifique o resultado operacional apenas como: rotina normal, monitoramento reforçado, ação corretiva/avaliação técnica, ou retirar de serviço.",
  "",
  "Regras:",
  "- Use somente evidência presente no documento. Todo achado técnico deve informar o trecho, tabela ou valor que o sustenta.",
  "- 'Not informed'/'Não informado' é dado indisponível declarado, não campo esquecido e não deve reduzir a qualidade por si só.",
  "- Uma faixa de diâmetro não é anomalia isoladamente. Só aponte redução de diâmetro quando o documento demonstrar violação do critério aplicável, contradição com a tabela de severidade ou quando o próprio relatório a tratar como condição relevante.",
  "- Não critique qualidade de fotos se as imagens não foram fornecidas visualmente à análise.",
  "- Diferencie anomalia de descarte, anomalia que exige monitoramento e condição normal.",
  "- Quando o relatório declara comprimento inspecionado menor que o comprimento total, confirme que a conclusão delimita o trecho inspecionado ou que o escopo foi definido pelo cliente/operação.",
  "- Compare número do relatório, JBR, aplicação e diâmetro citados no nome do arquivo com o conteúdo interno. Divergência é achado de controle documental, não conclusão sobre a condição do cabo.",
  "- Não crie padrões permanentes automaticamente a partir de um único relatório.",
].join("\\n");

export const buildRopeReviewContext = (documentText: string) =>
  "=== PERFIL DE REVISÃO APLICÁVEL ===\\n" + ROPE360_ISO4309_PROFILE + "\\n=== DOCUMENTO PARA REVISÃO ===\\n" + documentText;

export const runRopeDocumentPreChecks = (documentText: string, fileName: string): RopeReviewFinding[] => {
  const findings: RopeReviewFinding[] = [];
  const filenameReport = fileName.match(/LS\s*BR\s*(\d{3,4})/i)?.[1];
  const internalReport = documentText.match(/(?:Report(?:\s+Number)?|Relat[óo]rio)\s*(?:No|N[ºo])?\s*[:\/]?\s*LS\s*BR\s*(\d{3,4})/i)?.[1];

  if (filenameReport && internalReport && filenameReport !== internalReport) {
    findings.push({
      priority: "review",
      category: "document_control",
      evidence: "O arquivo indica LS BR " + filenameReport + ", mas o conteúdo interno indica LS BR " + internalReport + ".",
      recommendation: "Confirmar se o arquivo correto foi anexado ao JBR ou se houve duplicidade/renomeação antes da emissão.",
    });
  }

  const severityMatches = [...documentText.matchAll(/(?:maximum combined severity(?: rating)?|severidade(?:\s+m[aá]xima)?(?:\s+combinada)?)\D{0,40}(\d{1,3})\s*%/gi)]
    .map((match) => Number(match[1]));
  const differentSeverities = [...new Set(severityMatches)];
  if (differentSeverities.length > 1) {
    findings.push({
      priority: "critical",
      category: "technical_consistency",
      evidence: "O texto apresenta valores diferentes para severidade combinada: " + differentSeverities.map((value) => value + "%").join(" e ") + ".",
      recommendation: "Conferir a tabela de severidade e padronizar o valor em todas as versões linguísticas do relatório.",
    });
  }

  const totalLength = documentText.match(/(?:Original|Nominal)\s+(?:Rope\s+)?Length\D{0,80}(\d{3,5})\s*m/i)?.[1];
  const inspectedLength = documentText.match(/(?:Length\s+of\s+Rope\s+Inspected|total\s+of)\D{0,60}(\d{3,5})\s*(?:m|meters)/i)?.[1];
  if (totalLength && inspectedLength && Number(inspectedLength) < Number(totalLength) && !/scope|defined by the client|comprimento inspecionado foi definido/i.test(documentText)) {
    findings.push({
      priority: "review",
      category: "inspection_scope",
      evidence: "Comprimento total identificado: " + totalLength + " m; comprimento inspecionado identificado: " + inspectedLength + " m.",
      recommendation: "Delimitar na conclusão que a decisão se aplica ao trecho inspecionado ou registrar a justificativa operacional para o escopo parcial.",
    });
  }

  return findings;
};

export const filterUnsupportedSuggestions = (suggestions: string[] | undefined, documentText: string): string[] => {
  if (!suggestions) return [];
  const text = documentText.toLowerCase();
  const installationExplicitlyUnknown = /installation date[\s\S]{0,80}(not informed)|data de instala[cç][aã]o[\s\S]{0,80}(n[aã]o informado)/i.test(text);
  const certificatePresent = /wire rope certificate|certificado (original )?(do )?cabo|certificado do cabo de a[cç]o/i.test(text);
  const lmaAndLfDeclared = /lma observations[\s\S]{0,500}(no anomalies|no anomaly)|observa[cç][oõ]es de perda de [aá]rea[\s\S]{0,500}(nenhuma anomalia)/i.test(text)
    && /lf observations[\s\S]{0,500}(no anomalies|no anomaly)|observa[cç][oõ]es de falhas[\s\S]{0,500}(nenhuma anomalia)/i.test(text);

  return suggestions.filter((suggestion) => {
    const normalized = suggestion.toLowerCase();
    if (installationExplicitlyUnknown && /instala[cç][aã]o|installation/.test(normalized)) return false;
    if (certificatePresent && /certificat/.test(normalized)) return false;
    if (lmaAndLfDeclared && /lma|lf|falhas localizadas|perda de [aá]rea/.test(normalized)) return false;
    if (/glossário|não especialistas|leitor(?:es)? leigo/.test(normalized)) return false;
    if (/setas?|círculos?|anotações? (?:nas|em) imagens|destacar.*(?:foto|imagem)/.test(normalized)) return false;
    if (/cronograma|etapas iniciais.*plano|plano conjunto/.test(normalized)) return false;
    if (/(?:detalhar|incluir|explicar).{0,50}critérios?.{0,40}(?:iso|4309|descarte)/.test(normalized)) return false;
    return true;
  });
};
