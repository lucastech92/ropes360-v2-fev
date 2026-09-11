# Acesso à página de Atas de Reuniões no celular

## O que está acontecendo

A página de Atas de Reuniões existe e funciona, mas o atalho para ela só foi
adicionado no menu da versão para computador. No celular (que é como você está
vendo agora) o menu lateral não tem esse item, então não há por onde chegar até
a página.

A página em si está protegida: só quem tem perfil de Administrador ou
Moderador consegue abrir. Se o seu acesso for de Inspetor, mesmo com o atalho
a página não abrirá.

## O que vou fazer

1. Adicionar "Atas de reuniões" ao menu do celular, dentro do grupo Gestão,
   junto de Histórico, Folha de Ponto e Calendário.
2. Mostrar esse item apenas para quem tem permissão de Administrador ou
   Moderador, para ninguém clicar e cair numa tela vazia.
3. Incluir também a página na busca rápida (atalho de busca), para achar por
   "atas" ou "reunião".
4. Testar no tamanho de tela do celular abrindo a página pelo menu.

## Detalhes técnicos

- `src/components/MobileNav.tsx`: adicionar `{ label: "Atas de reuniões",
  href: "/atas-reuniao", icon: ClipboardList }` ao grupo Gestão, filtrando por
  `useUserRole()` (`isAdmin || isModerator`).
- `src/components/CommandPalette.tsx`: registrar a rota `/atas-reuniao`.
- Rota e proteção em `src/App.tsx` já estão corretas (`RoleRoute` com
  `admin`/`moderator`) — nenhuma alteração ali.

## Pergunta em aberto

Se você estiver logado como Inspetor, me diga: posso liberar a leitura das
atas para inspetores (só visualização, sem criar ou excluir)?
