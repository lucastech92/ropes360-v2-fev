# Ropes360 — continuidade do projeto

Este arquivo permite continuar o desenvolvimento em outro computador ou em uma nova tarefa do Codex.

## Visão do produto

O Ropes360 é uma plataforma de gestão operacional e inteligência para equipes de serviços de campo. Conecta pessoas, equipamentos, ativos, inspeções, logística e conhecimento técnico, transformando dados operacionais em informações para decisão, redução de riscos, conformidade e eficiência.

O aplicativo não executa a inspeção técnica em campo. Em campo, a equipe consulta normas, procedimentos e IA. Relatórios e certificados existentes (Word/PDF) são enviados posteriormente para revisão assistida.

## Entidade central

O JBR representa o serviço completo. Fluxo oficial:

1. Planejamento.
2. Preparação e checklist de embarque.
3. Logística e container.
4. Execução em campo.
5. Upload de documentos.
6. Revisão técnica por IA.
7. Checklist de retorno/desembarque.
8. Fechamento, histórico e indicadores.

## Perfis

- Campo: checklists, consultas técnicas, upload e retorno.
- Administrativo: estoque, logística, certificações e manutenção.
- Coordenador: cria JBR, planeja, acompanha e decide.

## Estado implementado

- Sprint 0: arquitetura orientada ao JBR.
- Sprint 1: ciclo de vida e fases do JBR.
- Sprint 2: checklists vinculados ao JBR.
- Sprint 3: documentos e base da revisão por IA.
- Sprint 4: logística e reserva de container.
- Sprint 5: retorno/desembarque.
- Sprint 6: baixa e reconciliação do inventário com histórico de movimentos.
- Sprint 7: dashboard operacional.
- Sprint 8: perfis específicos adiada.
- Sprint 9: IA revisora ISO 4309 preparada localmente; publicação da função ainda pendente.
- Sprint 10: Central de Conhecimento estilo NotebookLM iniciada localmente; migração e funções ainda pendentes de publicação.

## Decisão de UX/UI

O princípio atual é **essencialismo**, não minimalismo:

> Se a informação ajuda o usuário a decidir ou agir sem abrir outra tela, ela permanece.

- Remover redundância e decoração, não contexto operacional.
- Uma ação principal por tela.
- Ações secundárias agrupadas.
- Espaço em branco organiza, mas não deve gerar telas vazias.
- Status, contexto, período, cliente, local, escopo e vínculos devem permanecer visíveis quando ajudam a decisão.

## Alterações locais recentes

- Cabeçalho persistente com áreas Operação, Recursos, Conhecimento e Gestão.
- Home reorganizada como visão geral com quatro acessos principais.
- Lista de JBRs com JBR, cliente, local, escopo, checklists, fase e período.
- Tela interna do JBR ampliada; checklists e logística lado a lado; histórico recolhido.
- Checklist reorganizado em Em uso, Templates e Arquivados.
- Clonagem de checklist permite selecionar JBR opcional, container opcional e criar container.
- Criação/edição de checklist usa “JBR (opcional)” e “Container (opcional)”.
- Nova IA revisora exige evidência e é calibrada para ISO 4309.

## Banco Lovable Cloud

O backend é gerenciado pelo Lovable Cloud. Não há acesso normal ao dashboard separado do Supabase.

Migrações já aplicadas incluem tabelas/funções de retorno, fotografia de despacho e movimentos do inventário.

Migração local ainda pendente de aplicação:

`supabase/migrations/20260711020000_technical_knowledge_governance.sql`

Funções locais ainda pendentes de publicação:

- `supabase/functions/analyze-report/index.ts`
- `supabase/functions/technical-assistant-chat/index.ts`

Não usar o conector Lovable diretamente sem pedido explícito. Ele apresentou erro OAuth `invalid_client`. Alterações de banco têm sido enviadas manualmente ao chat do projeto Lovable, solicitando SQL apenas e sem alterações no frontend.

## Relatórios usados para calibrar a IA

- A ISO 4309 é a referência em aproximadamente 99% dos casos.
- Variação normal de diâmetro não é divergência isoladamente.
- “Not informed” pode ser declaração válida.
- Não criticar fotos quando a imagem não estiver acessível.
- Diferenciar comprimento total e trecho inspecionado.
- Detectar contradições entre idioma, conclusão e severidade.
- O relatório LS BR 0295 possui número interno 0283 e deve gerar alerta de controle documental/possível duplicidade.

## Como executar

```powershell
npm install
npm run dev
```

Endereço padrão: `http://localhost:8080/`

Verificação usada durante o desenvolvimento:

```powershell
npx tsc --noEmit
```

## Orientação para a nova tarefa Codex

Antes de alterar o projeto:

1. Leia este arquivo integralmente.
2. Inspecione o estado real do código.
3. Preserve funcionalidades e mudanças locais.
4. Continue segundo o princípio de essencialismo.
5. Não publique no Lovable nem altere o banco sem confirmação do usuário.
