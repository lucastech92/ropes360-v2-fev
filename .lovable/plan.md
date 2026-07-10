# Plano: Consolidar o Core do Ropes360

## Objetivo
Alinhar a identidade do produto, a home e a primeira experiência tangível com o novo posicionamento de **plataforma de gestão operacional e inteligência para equipes de serviços de campo**. O foco imediato é documentar o core e traduzi-lo na home, metadados e no primeiro pilar prioritário: **Equipamentos**.

---

## 1. Memória do projeto: registrar o core
**Arquivo:** `mem://index.md`

- Adicionar ao `Core` a definição de plataforma: conecta pessoas, equipamentos, ativos, inspeções, logística e conhecimento técnico; transforma dados operacionais em informação estratégica para decisão, redução de risco, conformidade e eficiência.
- Registrar o **pilar prioritário**: Equipamentos (inventário, manutenção, calibração) é o primeiro domínio a refletir a nova plataforma, por ser o ativo mais crítico e visível em campo.
- Registrar o **tom de voz**: corporativo/estratégico para admin/moderadores, mantendo a praticidade operacional para inspetores de campo.

---

## 2. Metadados e head estático
**Arquivo:** `index.html`

- Atualizar `<title>` para posicionar o app como plataforma de inteligência operacional (ex: "Ropes 360 — Plataforma de Inteligência Operacional").
- Atualizar `<meta name="description">` e `og:description` para reforçar: gestão de equipipes de campo, equipamentos, ativos, inspeções e conhecimento técnico.
- Ajustar `og:title` e `twitter:title` para o novo posicionamento.
- Remover/rever a `og:image` genérica do Lovable (a menos que seja gerada uma imagem própria, o hosting injetará preview automaticamente).

---

## 3. Home page e hero
**Arquivo:** `src/pages/Index.tsx` (textos via i18n)

- Alterar o badge do hero de "Centro de Inteligência Técnica" para algo que reflita a plataforma estratégica (ex: "Plataforma de Gestão Operacional").
- Reescrever `heroDescription` e `heroHighlight` para comunicar a nova proposta: conectar pessoas, equipamentos, inspeções e conhecimento; transformar dados operacionais em decisão estratégica.
- Manter a estrutura visual existente — mudança apenas de copy e tom.

---

## 4. Internacionalização
**Arquivos:** `src/i18n/locales/pt-BR/common.json`, `src/i18n/locales/en-US/common.json`, `src/i18n/locales/es-ES/common.json`

- Atualizar chaves `home.heroBadge`, `home.heroDescription`, `home.heroHighlight`, `home.heroHighlightSuffix` nos três idiomas para o tom corporativo/estratégico.
- Atualizar `header.title` e `header.subtitle` (ex: "Ropes 360" / "Plataforma de Inteligência Operacional").
- Atualizar `modules.descriptions.inventory` e `inventory.subtitle` para destacar o pilar Equipamentos como gestão inteligente de ativos: disponibilidade, conformidade e manutenção preventiva.
- Ajustar `modules.descriptions.operationsSubtitle` e `managementSubtitle` para ecoar a nova narrativa (operações em campo, decisão e eficiência).

---

## 5. Pilar prioritário: Equipamentos
**Arquivo:** `src/pages/Inventario.tsx` e componentes de inventário

- Ajustar título e subtítulo da página de inventário para reforçar o posicionamento de ativos operacionais (ex: "Gestão de Ativos e Equipamentos" / "Disponibilidade, manutenção e conformidade dos ativos de campo").
- Garantir que `src/components/inventory/InventoryDashboard.tsx` use chaves de i18n para os rótulos dos cards (hoje estão hardcoded em português).
- Opcionalmente, adicionar uma breve mensagem de contexto no topo da aba de Itens comunicando o valor estratégico do pilar (operational readiness).

---

## Fora de escopo nesta entrega
- Reorganização completa da navegação ou criação de novas páginas.
- Novo dashboard executivo/BI (pode ser próximo passo após validação do pilar Equipamentos).
- Geração de imagem de social preview.

---

## Validação
- Build do Vite sem erros de TypeScript/i18n.
- Verificação visual da home e da página de inventário no preview.
- Revisão das três localizações para consistência de tom.