

# Módulo de Certificações — Fluxo Simplificado

## Conceito
O usuário faz upload do certificado (PDF/imagem), informa o **nome/tipo do treinamento** e a **data de validade**. Sem formulários complexos — 3 campos no total.

## Banco de Dados

### Tabela `certifications`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | auto |
| user_id | uuid | técnico dono |
| certification_name | text | Ex: "NR-35", "ISO 4309" |
| expiry_date | date | validade |
| file_path | text | caminho no storage |
| file_name | text | nome original do arquivo |
| created_by | uuid | quem fez o upload |
| created_at | timestamptz | auto |

Status (válido/vencendo/vencido) será **calculado no frontend** com base em `expiry_date` vs data atual — sem coluna extra.

### Tabela `competency_matrix`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | auto |
| user_id | uuid | técnico |
| skill_name | text | competência |
| skill_level | text | beginner/intermediate/advanced/expert |
| verified_by | uuid | quem validou |
| verified_at | timestamptz | |
| notes | text | |

### RLS
- SELECT: próprio user vê seus certificados; admin/moderator veem todos
- INSERT: qualquer autenticado (com `created_by = auth.uid()`)
- UPDATE/DELETE: admin/moderator apenas

### Storage
Reutilizar bucket `documents` (já existente) com path `certifications/{user_id}/{file_name}`

## Frontend

### Fluxo de Upload (3 campos)
1. **Arrastar/selecionar arquivo** (PDF ou imagem)
2. **Nome do certificado** — input text com sugestões rápidas (NR-35, NR-34, ISO 4309, NR-33, NR-11, etc.)
3. **Data de validade** — date picker

Botão "Salvar" faz upload no storage e insere na tabela.

### Página `/certificacoes`
- **Aba Certificados**: cards coloridos por status (verde=válido, amarelo=vencendo em 30d, vermelho=vencido). Filtro por técnico e status. Preview/download do arquivo.
- **Aba Competências**: matriz visual técnico × competência (admin/moderator editam)
- **Aba Visão Geral**: contadores rápidos + lista de ações urgentes

### Componentes
- `src/pages/Certificacoes.tsx` — página com 3 abas
- `src/components/certifications/CertificationUpload.tsx` — form simplificado (3 campos)
- `src/components/certifications/CertificationCard.tsx` — card com status colorido
- `src/components/certifications/CompetencyMatrix.tsx` — tabela de competências
- `src/hooks/useCertifications.ts` — queries e mutations

### Integração
- Nova rota `/certificacoes` protegida no `App.tsx`
- Card na seção "Gestão" da Home page
- Alertas de vencimento reutilizando `create_notification_with_push()` existente
- i18n em pt-BR, en-US, es-ES

## Resumo da Implementação
1. Migração SQL (tabelas + RLS + função de alerta)
2. Página + componentes + hook
3. Rota no App.tsx + card na Home
4. Traduções i18n

