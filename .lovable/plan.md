# Home: hub de acessos com indicadores vivos

## Objetivo
Substituir o hub genérico da Home por quatro acessos diretos e úteis: **Inventário**, **Atas de Reuniões**, **Modelos** e **Gestão**.

## Implementação
- Criar um hub responsivo com quatro blocos de acesso, respeitando as permissões atuais:
  - Inventário: total de itens, itens abaixo do mínimo e evolução recente do estoque.
  - Atas de Reuniões: total de atas, ações abertas/atrasadas e evolução mensal.
  - Modelos: total de pacotes, arquivos associados e evolução mensal.
  - Gestão: usuários aprovados, aprovações pendentes e distribuição por cargo.
- Exibir gráficos compactos dentro dos acessos para leitura rápida sem poluir a Home.
- Manter Atas e Gestão disponíveis apenas para Admin/Moderador; Inspetor verá somente os acessos permitidos.
- Atualizar os números automaticamente por eventos do banco e também por atualização periódica de segurança.
- Preservar os demais blocos já existentes na Home: saudação, alertas, pulso da operação e saúde operacional.

## Detalhes técnicos
- Centralizar consultas e atualização em um hook dedicado da Home.
- Usar os componentes visuais e tokens já existentes, com links internos e estados de carregamento.
- Assinar alterações das tabelas relacionadas e invalidar apenas os dados do hub.
- Validar o resultado em celular e desktop, além de conferir o build.
