

# Melhoria da Tradução - Plano

## Problema Atual

A cobertura de tradução está incompleta em duas dimensões:

1. **Strings hardcoded em português** — Muitos componentes usam texto em português diretamente no código ao invés de chaves i18n:
   - `NavigationBreadcrumb.tsx`: todas as 15+ labels de rotas hardcoded
   - `MobileNav.tsx`: "Assistente IA", "Meus Downloads", "Instalar App", "Treinamento ISO 4309", "Resolução de Problemas", "Calendário", "Gerenciar Usuários"
   - `Index.tsx`: descrições dos módulos e labels como "Resolução de Problemas", "Gerenciar Usuários"
   - `Notificacoes.tsx`: labels de filtros ("Todos os tipos", "Calibração", "Crítica", etc.)
   - `Inventario.tsx`: labels de abas e botões
   - Diversas páginas com títulos, placeholders e mensagens em português

2. **Chaves i18n faltando nos JSONs** — Novas features (notificações, checklist salvos, calendário, etc.) não tiveram suas chaves adicionadas aos 3 arquivos de idioma.

3. **date-fns locale hardcoded** — Vários componentes usam `ptBR` fixo do date-fns ao invés de selecionar o locale com base no idioma ativo.

## Plano de Implementação

### 1. Expandir os arquivos de tradução (3 arquivos JSON)
Adicionar seções faltantes nos 3 idiomas (pt-BR, en-US, es-ES):
- `notifications.page` — filtros e ações da página de notificações
- `nav` — labels de navegação (breadcrumb + mobile nav)
- `modules` — descrições dos módulos (Index.tsx)
- `calendar` — página de calendário
- `checklist` — novas keys para salvos/templates
- `inventory.tabs` — abas do inventário
- Chaves avulsas espalhadas pelo app

### 2. Substituir strings hardcoded nos componentes
Atualizar os seguintes arquivos para usar `t()`:
- `src/components/NavigationBreadcrumb.tsx`
- `src/components/MobileNav.tsx`
- `src/pages/Index.tsx`
- `src/pages/Notificacoes.tsx`
- `src/pages/Inventario.tsx`
- `src/pages/CheckList.tsx`
- `src/components/checklist/SavedChecklistsTab.tsx`
- `src/components/dashboard/AlertsSummaryWidget.tsx`
- Outras páginas com strings hardcoded

### 3. Criar helper de locale dinâmico para date-fns
Criar `src/utils/dateLocale.ts` com uma função que retorna o locale correto do date-fns baseado no idioma ativo do i18n (`ptBR`, `enUS`, `es`). Atualizar componentes que usam `formatDistanceToNow`, `format`, etc.

### 4. Corrigir build error em main.tsx
Resolver o erro de atributos duplicados `data-lov-id` no `src/main.tsx`.

## Arquivos afetados
- `src/i18n/locales/pt-BR/common.json` — expandir
- `src/i18n/locales/en-US/common.json` — expandir
- `src/i18n/locales/es-ES/common.json` — expandir
- `src/utils/dateLocale.ts` — novo
- `src/main.tsx` — fix build
- ~10-15 componentes/páginas — substituir hardcoded por `t()`

