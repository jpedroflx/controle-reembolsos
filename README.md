# Controle de Solicitações de Reembolso

Aplicação fullstack para controle de solicitações de reembolso, desenvolvida como desafio técnico do programa de estágio da Pitang.

O sistema permite que colaboradores criem solicitações, gestores aprovem ou rejeitem pedidos, o financeiro realize pagamentos e administradores gerenciem categorias. A aplicação roda localmente com SQLite.

## Stack

Backend: Node.js, Express, TypeScript, Prisma ORM, SQLite, Zod, JWT, bcrypt, Jest e Supertest.

Frontend: Vite, React, TypeScript, React Router, Context API, Axios, Chakra UI, Vitest e React Testing Library.

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- Git

Não é necessário instalar SQLite separadamente. O banco é um arquivo local gerenciado pelo Prisma.

## Instalação

Na raiz `controle-reembolsos`:

```powershell
npm install
```

Crie os arquivos `.env`:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Valores esperados:

```env
# backend/.env
NODE_ENV=development
PORT=3333
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-local-development"
CORS_ORIGIN="http://localhost:5173"

# frontend/.env
VITE_API_URL="http://localhost:3333"
```

## Banco de dados

Na raiz `controle-reembolsos`:

```powershell
npm run prisma:migrate
npm run prisma:seed
```

O comando `npm run prisma:migrate` aplica as migrations existentes e gera o Prisma Client. Em um clone limpo, ele já cria o banco com os campos extras de categoria, como `maxAmount` e `attachmentRequiredAboveAmount`.

Se o banco local já existia antes desses campos, pare o servidor e rode novamente:

```powershell
npm run prisma:migrate
npm run prisma:seed
```

O banco SQLite fica em `backend/prisma/dev.db`.

## Executando

Para iniciar backend e frontend juntos, use um terminal na raiz `controle-reembolsos`:

```powershell
npm run dev
```

URLs:

```text
Backend:  http://localhost:3333
Frontend: http://localhost:5173
Health:   http://localhost:3333/health
```

Para iniciar separadamente:

```powershell
npm run dev:backend
npm run dev:frontend
```

## Rodando com Docker Compose

Docker Compose é opcional. O fluxo local com `npm install`, migrations, seed e `npm run dev` continua funcionando normalmente.

Na raiz `controle-reembolsos`:

```powershell
docker compose up --build -d
docker compose exec backend npm run prisma:seed
```

URLs:

```text
Backend:  http://localhost:3333
Frontend: http://localhost:5173
Health:   http://localhost:3333/health
```

O backend aplica as migrations ao iniciar. O SQLite usa o volume `backend-sqlite-data`, montado em `/app/data`, então os dados não são apagados a cada rebuild.

Para acompanhar logs ou parar os containers:

```powershell
docker compose logs -f
docker compose down
```

Use `docker compose down -v` apenas se quiser apagar o volume e recriar o banco do zero.

## Testes, typecheck e build

Na raiz `controle-reembolsos`:

```powershell
npm run typecheck
npm test
npm run build
```

Por workspace:

```powershell
npm test -w backend
npm test -w frontend
npm run typecheck -w backend
npm run typecheck -w frontend
npm run build -w backend
npm run build -w frontend
```

Comandos úteis do Prisma:

```powershell
npm run prisma:generate
npm run prisma:studio -w backend
```

## Usuários de teste

Todos os usuários criados pelo seed usam a senha `Senha@123`.

| Perfil | Email | Senha |
| --- | --- | --- |
| COLABORADOR | colaborador@teste.com | Senha@123 |
| GESTOR | gestor@teste.com | Senha@123 |
| FINANCEIRO | financeiro@teste.com | Senha@123 |
| ADMIN | admin@teste.com | Senha@123 |

O cadastro público cria apenas usuários `COLABORADOR`. Perfis `GESTOR`, `FINANCEIRO` e `ADMIN` ficam disponíveis pelo seed.

## Fluxo rápido

1. Entre como `colaborador@teste.com`.
2. Crie uma solicitação em `Nova solicitação`.
3. Adicione um anexo simulado enquanto a solicitação estiver em `RASCUNHO`, se desejar.
4. Envie a solicitação.
5. Entre como `gestor@teste.com` para aprovar ou rejeitar solicitações `ENVIADAS`.
6. Entre como `financeiro@teste.com` para pagar solicitações `APROVADAS`.
7. Entre como `admin@teste.com` para visualizar dados gerais e gerenciar categorias.

## Diferenciais implementados

### Filtros, paginação e ordenação

Na tela `Dashboard`, acima da listagem, é possível combinar:

- filtro por status;
- filtro por categoria ativa;
- busca por colaborador por nome ou email, exceto para `COLABORADOR`;
- ordenação por criação, data da despesa ou valor;
- ordem crescente ou decrescente;
- tamanho da página com 5, 10, 20 ou 50 itens;
- navegação por `Anterior` e `Próxima`.

A API também aceita esses filtros em `GET /reimbursements`:

```text
?status=ENVIADO&categoriaId=<id>&solicitante=nome-ou-email&sortBy=valor&sortOrder=desc&page=1&pageSize=10
```

Os filtros respeitam RBAC. Um colaborador continua vendo apenas as próprias solicitações, mesmo tentando buscar outro solicitante.

### Cards de resumo

O `Dashboard` consome `GET /reimbursements/summary` e exibe:

- total de solicitações visíveis para o perfil;
- valor total;
- totais por status;
- totais por categoria.

O resumo usa a mesma regra de visibilidade da listagem: colaborador vê apenas o que é dele, gestor vê `ENVIADO`, financeiro vê `APROVADO` e admin vê dados gerais.

### Regras extras de negócio

- Categorias podem ter `maxAmount`; valores acima do limite são bloqueados na criação e edição.
- Categorias podem ter `attachmentRequiredAboveAmount`; acima desse valor, a solicitação só pode ser enviada se tiver anexo.
- Solicitações com `dataDespesa` futura são bloqueadas no backend e no frontend.
- Categorias inativas não aparecem como opção no frontend e não podem ser usadas em novas solicitações pela API.
- Anexos são simulados: a aplicação salva nome, tipo e URL, sem upload real.
- A tela de detalhe mostra aviso quando falta anexo obrigatório antes de enviar.
- Anexos simulados podem ser abertos em nova aba pelos botões `Visualizar` e `Baixar/Abrir`.
- Docker Compose opcional com backend, frontend e SQLite persistido em volume.

## Collection Postman

A collection está em:

```text
docs/postman/controle-reembolsos.postman_collection.json
```

Como usar:

1. Rode `npm run dev` na raiz `controle-reembolsos`.
2. Importe a collection no Postman.
3. Confira a variável `baseUrl`, com valor padrão `http://localhost:3333`.
4. Execute `Health check`.
5. Execute os logins de cada perfil para preencher os tokens.
6. Use os requests de categorias, solicitações, transições, histórico e anexos simulados.

A collection usa variáveis como `baseUrl`, `token`, `collaboratorToken`, `managerToken`, `financeToken`, `adminToken`, `categoryId` e `reimbursementId`. Alguns requests gravam essas variáveis automaticamente no Environment ativo do Postman.

## Endpoints principais

Rotas protegidas usam `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/auth/login` | Login com JWT |
| POST | `/users` | Cadastro público de colaborador |
| GET | `/users` | Lista usuários para admin |
| GET | `/categories` | Lista categorias |
| POST | `/categories` | Cria categoria para admin |
| PUT | `/categories/:id` | Edita categoria para admin |
| GET | `/reimbursements` | Lista solicitações conforme perfil |
| GET | `/reimbursements/summary` | Resumo do dashboard conforme perfil |
| POST | `/reimbursements` | Cria solicitação em rascunho |
| GET | `/reimbursements/:id` | Detalhe da solicitação |
| PUT | `/reimbursements/:id` | Edita solicitação em rascunho |
| POST | `/reimbursements/:id/submit` | Envia solicitação |
| POST | `/reimbursements/:id/approve` | Aprova solicitação |
| POST | `/reimbursements/:id/reject` | Rejeita solicitação |
| POST | `/reimbursements/:id/pay` | Marca como paga |
| POST | `/reimbursements/:id/cancel` | Cancela rascunho |
| GET | `/reimbursements/:id/history` | Histórico |
| GET | `/reimbursements/:id/attachments` | Lista anexos simulados |
| POST | `/reimbursements/:id/attachments` | Cria anexo simulado |

## Permissões e status

| Perfil | Permissões principais |
| --- | --- |
| COLABORADOR | Cria solicitações, vê apenas as próprias, edita/envia/cancela em `RASCUNHO` e adiciona anexos em rascunhos próprios. |
| GESTOR | Vê solicitações `ENVIADAS`, aprova e rejeita com justificativa obrigatória. |
| FINANCEIRO | Vê solicitações `APROVADAS` e marca como pagas. |
| ADMIN | Visualiza dados gerais, lista usuários e gerencia categorias. |

Transições:

```text
RASCUNHO -> ENVIADO    COLABORADOR dono
ENVIADO  -> APROVADO   GESTOR
ENVIADO  -> REJEITADO  GESTOR
APROVADO -> PAGO       FINANCEIRO
RASCUNHO -> CANCELADO  COLABORADOR dono
```

Transições inválidas retornam `400`. Perfis sem permissão retornam `403`.

## Decisões técnicas

- Monorepo simples, sem Clean Architecture, DDD ou microsserviços.
- Backend organizado por rotas, controllers, schemas, middlewares e Prisma Client.
- Prisma com SQLite para facilitar avaliação local.
- Zod valida entrada da API.
- Frontend usa Context API para sessão e Axios centralizado para enviar o token.
- O frontend esconde ações por perfil/status, mas a API continua sendo a autoridade.

## Fora do escopo intencionalmente

- Upload real para storage externo.
- Recuperação de senha.
- Refresh token.
- Deploy.
- Testes end-to-end com navegador real.

## Checklist rápido para avaliação

Na raiz `controle-reembolsos`:

```powershell
npm install
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Depois abra `http://localhost:5173/login` e entre com:

```text
admin@teste.com / Senha@123
```

Para validar qualidade:

```powershell
npm run typecheck
npm test
npm run build
```
