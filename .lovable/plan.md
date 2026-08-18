# Visão de Estoque Reservado no Inventário

Objetivo: bater o olho no inventário e identificar rapidamente quais checklists de saída estão segurando material — em especial os "avulsos", sem vínculo com nenhum JBR.

## O que será criado

1. **Novo card no painel do inventário: "Estoque Reservado"**
   - Mostra o total de unidades reservadas por checklists de saída ativos.
   - Subtexto: quantos itens distintos estão reservados e quantas unidades vêm de checklists sem JBR.
   - Card fica alaranjado/âmbar quando houver reserva avulsa (sinal de atenção).
   - Clique abre o detalhamento (ver item 2) — diferente dos outros cards, que apenas filtram a lista.

2. **Painel de detalhamento "Reservas de estoque"** (dialog)
   - Lista agrupada por checklist de saída, com: nome do checklist, JBR vinculado (ou selo "Avulso — sem JBR"), data de criação e total de unidades reservadas.
   - Dentro de cada checklist, os itens reservados: nome do item, quantidade planejada, já despachada e ainda reservada.
   - Filtro rápido: "Todos" / "Somente avulsos".
   - Atalho para abrir o checklist correspondente (link para a página de checklists) e, quando houver JBR, para o serviço.
   - Ordenação: avulsos primeiro, depois maior quantidade reservada.

3. **Filtro na lista de itens**
   - Nova opção de situação "Com estoque reservado", para ver apenas itens com reserva ativa.

## Detalhes técnicos

- Novo hook `src/hooks/useInventoryReservations.ts`: consulta `checklist_items` (com `inventory_item_id`, `target_quantity`), `checklists` (tipo `saida`, não template, não arquivado), `service_dispatch_items` (já despachado) e `service_checklists` + `services` para descobrir o vínculo JBR. A reserva por item segue exatamente a mesma regra da view `inventory_stock_availability`: `max(target_quantity - dispatched, 0)`.
- Novo componente `src/components/inventory/InventoryReservationsDialog.tsx` com a lista agrupada.
- `InventoryDashboard.tsx`: acrescenta o card (grid passa a 6 colunas em telas grandes) e recebe callback `onOpenReservations`.
- `useUnifiedInventory.ts`: `InventoryStats` ganha `reservedUnits`, `reservedItems` e `unlinkedReservedUnits`, calculados a partir dos dados já carregados de disponibilidade + do hook de reservas.
- `InventoryItemList.tsx` / `InventorySituationFilter`: nova opção `reserved`.
- Sem mudança de banco de dados: apenas leitura, respeitando as políticas de acesso já existentes.
- Textos em pt-BR/en-US/es-ES adicionados aos arquivos de tradução.
