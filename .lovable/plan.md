

# Pacotes de Inspeção — Reorganização de Modelos e Relatórios

## Problema Atual
A página "Modelos e Relatórios" é genérica — apenas lista documentos avulsos. Não existe o conceito de **pacote de inspeção** que agrupe os arquivos relacionados a uma mesma inspeção (certificado Word com TAG incremental tipo "LS BR 001", arquivo SLB do MRT, e o relatório digital).

## O que será construído

Uma nova aba **"Pacotes de Inspeção"** na página Modelos e Relatórios, com:

1. **Tabela `inspection_packages`** no banco de dados:
   - `id`, `user_id`, `tag_number` (ex: "LS BR 0268"), `client`, `service_id` (FK opcional para services), `description`, `inspection_date`, `created_at`
   - Auto-incremento do número sequencial baseado no prefixo

2. **Tabela `inspection_package_files`** para os arquivos de cada pacote:
   - `id`, `package_id`, `file_type` (enum: `certificate`, `slb_mrt`, `report`, `other`), `file_name`, `file_path`, `file_size`, `uploaded_at`

3. **UI do Pacote de Inspeção:**
   - Card de criação de novo pacote com campo para TAG (auto-sugerido com próximo número), cliente, data, descrição
   - Zona de upload multi-arquivo com labels por tipo (Certificado Word, Arquivo SLB/MRT, Outros)
   - Lista de pacotes com busca por TAG, cliente, data
   - Visualização expandida mostrando todos os arquivos do pacote com download individual ou em lote
   - Badge indicando quantos arquivos cada pacote tem e se está completo (certificado + SLB)

4. **Vinculação opcional ao Serviço JBR** — dropdown para associar o pacote a uma ordem de serviço existente

5. **RLS**: Todos os autenticados visualizam; inserção por user_id; delete apenas admin

## Fluxo do usuário
```text
Modelos e Relatórios
├── Pacotes de Inspeção  ← NOVA aba principal
│   ├── [+ Novo Pacote]
│   │   ├── TAG: LS BR 0269 (auto)
│   │   ├── Cliente: Petrobras
│   │   ├── Serviço JBR: JBR-2024-015 (opcional)
│   │   ├── Upload Certificado (.docx/.pdf)
│   │   ├── Upload SLB/MRT (.slb/.dat/.csv)
│   │   └── Upload Outros
│   └── Lista de pacotes (busca, filtro, download)
├── Templates Digitais (existente)
├── Modelos Disponíveis (existente)
└── Upload de Modelo (existente)
```

## Arquivos afetados
- **Nova migração SQL** — tabelas `inspection_packages` e `inspection_package_files` + RLS + storage
- **Novo hook** `src/hooks/useInspectionPackages.ts` — CRUD + auto-tag
- **Novo componente** `src/components/inspectionPackages/InspectionPackageForm.tsx` — formulário de criação
- **Novo componente** `src/components/inspectionPackages/InspectionPackageList.tsx` — lista com busca e expansão
- **Editar** `src/pages/ModelosRelatorios.tsx` — adicionar nova aba como default

## Detalhes técnicos
- O TAG auto-incrementa via query `SELECT tag_number FROM inspection_packages WHERE tag_number LIKE 'LS BR%' ORDER BY tag_number DESC LIMIT 1` e incrementa o número
- Arquivos armazenados no bucket `documents` sob path `inspection_packages/{package_id}/{file_type}/{filename}`
- Aceitar extensões: `.docx`, `.pdf`, `.slb`, `.dat`, `.csv`, `.xlsx`, `.jpg`, `.png`
- Limite de 20MB por arquivo (consistente com o resto do app)

