

# Plano: Adicionar link de instalação do app visível na navegação

## Problema
A página `/install` existe mas não há nenhum link no header ou menu mobile que leve o usuário até ela. O banner automático some por 7 dias após ser dispensado.

## Solução
Adicionar um botão/link "Instalar App" em dois lugares:

### 1. Header desktop (`src/components/Header.tsx`)
- Adicionar botão com ícone `Download` ao lado dos outros botões de navegação
- Só exibir quando o usuário **não estiver** na rota `/install`
- Usar o mesmo padrão visual dos botões existentes (ghost, com tooltip)

### 2. Menu mobile (`src/components/MobileNav.tsx`)
- Adicionar item "Instalar App" no menu lateral
- Ícone `Download` + texto "Instalar App"
- Mesmo padrão dos outros itens de navegação

### Arquivos a modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/components/Header.tsx` | Adicionar botão "Instalar App" na nav desktop |
| `src/components/MobileNav.tsx` | Adicionar item "Instalar App" no menu lateral |

