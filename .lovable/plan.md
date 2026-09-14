# Recomeçar do zero: checklists, serviços (JBR) e estoque

Objetivo: apagar todo o histórico operacional acumulado (checklists, JBRs, saídas e retornos de material, auditoria de estoque) e zerar as quantidades do inventário, mantendo o catálogo de itens, usuários, certificações, atas e documentos técnicos.

## O que será apagado

- Todos os 31 checklists e seus 68 itens, incluindo os 17 vínculos com JBRs.
- Todos os 13 serviços (JBR), junto com o que depende deles:
  - saídas de material e movimentos de estoque por JBR (18 + 46 registros);
  - sessões e itens de conferência de retorno (8 + 18);
  - colaboradores (5), histórico de fases (55), documentos de serviço e seus comentários de revisão (7 + 2);
  - vínculo de contêiner (1 contêiner volta a ficar livre) e o vínculo de 1 pacote de inspeção (o pacote continua existindo, só perde a ligação com o JBR).
- Todo o histórico de consumo do inventário (162 registros) e previsões.

## O que será mantido

- Os 30 itens do inventário (nome, código, categoria, unidade, calibração, fotos).
- Contêineres, pacotes de inspeção e seus arquivos, atas de reuniões, certificações, matriz de competências, documentos, usuários e permissões.
- Registros de manutenção de equipamento (3) — não dependem de JBR.

## Estoque

- Todos os 30 itens ficam com quantidade 0, incluindo os 4 hoje negativos (Wire lock 500cc: -6, Disco de Corte Stihl: -4, Cinta de elevação 2t x 2m: -1, MRT intron 20-40 rosca: -1).
- Equipamentos voltam para o status "disponível" e localização "Base", já que não há mais nenhum JBR em campo.
- Com nada reservado, o painel de "Estoque Reservado" fica em zero e a disponibilidade passa a refletir exatamente a contagem que você lançar.

## Depois da limpeza

Você recadastra a contagem física item por item no inventário e cria o primeiro checklist novo. A sinergia esperada volta a valer: reserva ao selecionar quantidade no checklist, baixa registrada por JBR e estorno na conferência de retorno.

## Detalhes técnicos

- Uma única operação transacional (`supabase--run_sql`), com deleção na ordem das dependências para não violar chaves estrangeiras: `service_return_items` → `service_return_sessions` → `service_inventory_movements` → `service_dispatch_items` → `service_resource_manifest_items` → `service_document_review_feedback` → `service_documents` → `service_phase_history` → `service_collaborators` → `service_checklists` → `checklist_items` → `checklists` → `inventory_consumption_history` → `inventory_predictions` → `inventory_allocations` → `services`.
- Antes de apagar serviços: `UPDATE operation_containers SET assigned_service_id = NULL`, `UPDATE inspection_packages SET service_id = NULL`, `UPDATE equipment SET current_service_id = NULL`.
- `UPDATE inventory SET quantity = 0, status = 'available' (só equipamentos), current_location = 'Base', last_updated = now()`.
- Triggers de estorno automático (`service_checklists`/`checklist_items` BEFORE DELETE) são neutralizados durante a limpeza — as saídas são apagadas antes dos checklists e o estoque é definido explicitamente no final, então nenhum estorno duplicado ocorre.
- Nenhuma mudança de schema, política RLS, função ou código do app. A view `inventory_stock_availability` continua igual e passa a mostrar tudo zerado.
- Este é um apagamento definitivo de dados: a operação pedirá sua confirmação antes de rodar.
