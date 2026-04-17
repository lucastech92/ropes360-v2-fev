

# Sistema de Permissões por Cargo (Admin / Moderador / Inspetor)

## Objetivo

Aplicar consistentemente as três regras de cargo em todo o app:

| Cargo | Visibilidade | Download | Upload | Editar | Excluir |
|---|---|---|---|---|---|
| **Admin** | Todos os módulos | ✅ | ✅ | ✅ | ✅ |
| **Moderador** | Todos os módulos | ✅ | ✅ | ✅ | ❌ |
| **Inspetor** | Apenas **Operações** (Serviços, Checklists, Modelos e Relatórios, Inventário) | ✅ | ✅ | ✅ | ❌ |

## Estado atual

- Tabela `user_roles` já existe com enum `app_role` (`admin`, `moderator`, `inspector`, `viewer`) e função `has_role` (security definer).
- RLS no banco já está configurado: `DELETE` quase sempre restrito a admin; `UPDATE/INSERT` aberto para autenticados na maioria das tabelas. Isso já cobre o backend.
- Frontend é inconsistente: cada página faz seu próprio fetch de role (Inventário, Certificações, Folha de Ponto, Assistente Técnico). Não há gate central por role na home.

## O que será construído

### 1. Hook central de permissões `src/hooks/useUserRole.ts`
Retorna `{ role, isAdmin, isModerator, isInspector, canDelete, canEdit, canUpload, isLoading }`. Faz uma única chamada ao montar e cacheia via React Query, eliminando os múltiplos fetches espalhados.

### 2. Filtro de módulos na Home (`src/pages/Index.tsx`)
- Admin/Moderador → vê **Knowledge + Operations + Management** (como hoje).
- Inspetor → vê **apenas Operations** (Serviços, Checklists, Modelos e Relatórios, Inventário). As seções Knowledge, Management e My Folders ficam ocultas, e a barra de navegação rápida é ajustada.

### 3. Filtro do menu lateral mobile (`src/components/MobileNav.tsx`)
Mesma lógica: inspetor só enxerga "Principal" (Home, Assistente, Downloads, Install) + "Operações". Knowledge e Management ocultos.

### 4. Filtro de rotas (`src/App.tsx`)
Wrapper `<RoleRoute allowedRoles={['admin','moderator']}>` para bloquear acesso direto a `/historico`, `/folha-ponto`, `/calendario`, `/certificacoes`, `/gerenciar-usuarios`, `/duvidas-frequentes`, `/procedimentos-oficiais` quando for inspetor (redireciona para `/`).

### 5. Esconder botões "Excluir" para Moderador e Inspetor
Nos componentes onde existem ações de delete na UI:
- `src/components/inventory/InventoryItemCard.tsx` — esconder item "Excluir" do dropdown
- `src/components/inspectionPackages/InspectionPackageList.tsx` — esconder botão delete
- `src/components/checklist/*` — esconder botões delete de checklists/itens
- `src/components/certifications/CertificationCard.tsx` — `canDelete` só se admin
- `src/pages/DuvidasFrequentes.tsx` — esconder Trash2
- `src/pages/Servicos.tsx`, `src/components/FolderManager.tsx`, `src/components/DocumentListWithTags.tsx` — esconder delete

Tudo passa a usar `useUserRole().canDelete` (= `isAdmin`).

### 6. RLS — sem mudanças
O banco já reflete a regra ("Only admins can delete..."). Confirmado nas policies de `inventory`, `inspection_packages`, `checklists`, `documents`, `services`, `certifications`, `folders`, etc.

## Fluxo visual

```text
Login
  ├─ ADMIN     → Home completa (3 seções) + todos os botões
  ├─ MODERATOR → Home completa (3 seções) + botões SEM "Excluir"
  └─ INSPECTOR → Home só com "Operações" (4 cards) + botões SEM "Excluir"
                 Rotas bloqueadas: /historico, /folha-ponto, /certificacoes,
                                   /gerenciar-usuarios, /duvidas-frequentes,
                                   /procedimentos-oficiais, /calendario
```

## Arquivos afetados

- **Novo**: `src/hooks/useUserRole.ts`
- **Novo**: `src/components/RoleRoute.tsx`
- **Editar**: `src/pages/Index.tsx`, `src/components/MobileNav.tsx`, `src/App.tsx`
- **Editar (esconder delete)**: `src/components/inventory/InventoryItemCard.tsx`, `src/components/inspectionPackages/InspectionPackageList.tsx`, `src/components/FolderManager.tsx`, `src/components/DocumentListWithTags.tsx`, `src/pages/Servicos.tsx`, `src/pages/DuvidasFrequentes.tsx`, `src/pages/Certificacoes.tsx`, e demais pontos com `Trash2` identificados
- **Refatorar (opcional)**: substituir os fetches manuais de role em `Inventario.tsx`, `Certificacoes.tsx`, `FolhaPonto.tsx`, `AssistenteTecnico.tsx` para usar o novo hook (consistência)

## Observação importante

A regra "Inspetor só vê Operações" remove o módulo **Certificações** da visão dele. Como inspetores normalmente precisam ver as próprias certificações vencendo, vale confirmar:

- Opção A: Inspetor **não** vê `/certificacoes` (regra estrita, como descrito).
- Opção B: Inspetor vê `/certificacoes` apenas das próprias (RLS já permite isso).

Vou seguir com a **Opção A** (regra estrita conforme solicitado). Se preferir B, basta dizer antes da implementação.

