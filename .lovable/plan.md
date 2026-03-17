

# Notificações Inteligentes - Plano de Melhoria

## Estado Atual
O sistema já possui uma infraestrutura robusta de notificações:
- Tabela `notifications` com 259 registros
- NotificationBell com popover, cores por urgência, navegação por módulo
- Funções SQL de checagem: `check_expiring_calibrations`, `check_maintenance_due`, `check_expiring_documents`, `check_expiring_certifications`
- Triggers: `notify_low_inventory`, `notify_on_maintenance_change`, `notify_on_calibration_change`, `notify_pending_approval`
- Edge Function `send-push-notification` para push notifications
- **pg_cron NÃO está habilitado** -- as funções de checagem periódica nunca executam automaticamente

## O que falta

### 1. Habilitar pg_cron + pg_net e agendar as checagens
Habilitar as extensões `pg_cron` e `pg_net`, e criar cron jobs para executar as 4 funções de checagem periodicamente:
- `check_expiring_calibrations()` -- diário às 8h
- `check_maintenance_due()` -- diário às 8h
- `check_expiring_documents()` -- diário às 8h
- `check_expiring_certifications()` -- diário às 8h

### 2. Página dedicada de Notificações `/notificacoes`
Atualmente as notificações só aparecem no popover do sino (20 últimas). Criar uma página completa com:
- Lista paginada de todas as notificações
- Filtros por tipo (calibração, manutenção, documento, inventário, certificação, aprovação)
- Filtros por urgência (crítica, atenção, informativo)
- Filtro lidas/não lidas
- Ação de marcar como lida individualmente e em lote
- Link "Ver todas" no popover do sino apontando para esta página

### 3. Resumo diário de alertas no Dashboard
Widget compacto no Dashboard mostrando contagem de alertas ativos por categoria:
- Calibrações vencendo/vencidas
- Manutenções atrasadas
- Documentos expirando
- Certificações expirando
- Estoque baixo

### 4. Realtime nas notificações
Habilitar realtime na tabela `notifications` para que o sino atualize instantaneamente sem esperar o refetch de 30s.

## Arquivos a criar/editar
- **Migration SQL**: habilitar pg_cron/pg_net, criar jobs, habilitar realtime
- **`src/pages/Notificacoes.tsx`**: página completa de notificações
- **`src/components/NotificationBell.tsx`**: adicionar link "Ver todas" e subscription realtime
- **`src/components/dashboard/AlertsSummaryWidget.tsx`**: widget de resumo de alertas
- **`src/pages/Dashboard.tsx`**: integrar widget de alertas
- **`src/App.tsx`**: nova rota `/notificacoes`
- **i18n**: traduções pt-BR, en-US, es-ES

