

# Timeline de Serviço (Service Story)

## Conceito
Visualização cronológica de **tudo que aconteceu** em um serviço JBR — criação, equipe alocada, equipamentos retirados/devolvidos, checklists preenchidos, manutenções e relatórios — em uma timeline vertical unificada.

## Fontes de Dados (todas já existem)

| Tabela | Evento | Campo de data |
|--------|--------|---------------|
| `services` | Criação do serviço | `created_at` |
| `service_collaborators` | Técnico alocado | `created_at` |
| `service_checklists` | Checklist vinculado | `created_at` |
| `equipment_allocations` | Checkout de equipamento | `checkout_date` |
| `equipment_allocations` | Checkin de equipamento | `checkin_date` |
| `inventory_allocations` | Checkout de inventário | `checkout_date` |
| `inventory_allocations` | Checkin de inventário | `checkin_date` |
| `activity_log` | Qualquer ação relacionada | `created_at` |
| `inspection_reports` | Relatório criado | `created_at` |

## Implementação

### 1. RPC Function `get_service_timeline(p_service_id uuid)`
Função SQL que faz UNION ALL das tabelas acima, filtrando por `service_id`, retornando:
- `event_type` (text): 'service_created', 'collaborator_added', 'equipment_checkout', 'equipment_checkin', 'checklist_linked', etc.
- `event_date` (timestamptz)
- `title` (text)
- `description` (text)
- `icon_type` (text): para mapear ícone no frontend
- `actor_name` (text): quem executou (join com `user_profiles`)

Ordenado por `event_date DESC`.

### 2. Nova Página `/servico/:id/timeline`
- `src/pages/ServiceTimeline.tsx`
- Header com info resumida do serviço (código JBR, cliente, local, status)
- Timeline vertical com cards coloridos por tipo de evento
- Ícones: Users (equipe), Wrench (equipamento), ClipboardList (checklist), FileText (relatório), Calendar (datas)
- Filtro por tipo de evento

### 3. Componentes
- `src/components/service/ServiceTimelineEvent.tsx` — card individual do evento
- `src/hooks/useServiceTimeline.ts` — hook que chama a RPC

### 4. Integração
- Botão "Ver Timeline" na página de edição do serviço (`NovoServico.tsx`)
- Botão "Ver Timeline" na lista de serviços (`Servicos.tsx`) — ícone de relógio ao lado do botão editar
- Nova rota protegida no `App.tsx`: `/servico/:id/timeline`

### 5. Visual
- Timeline vertical com linha central conectando eventos
- Cards alternando esquerda/direita em desktop, empilhados em mobile
- Cores por categoria: azul (equipe), verde (equipamento), amarelo (checklist), roxo (relatório), cinza (sistema)
- Badge com tempo relativo ("há 2 dias", "há 1 semana")

### 6. i18n
- Traduções em pt-BR, en-US, es-ES para todos os tipos de evento e labels

