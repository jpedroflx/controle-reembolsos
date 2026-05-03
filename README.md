# Controle de Reembolsos

Aplicacao fullstack para controle de solicitacoes de reembolso, desenvolvida como desafio tecnico de estagio.

O sistema permite que colaboradores criem e acompanhem solicitacoes, gestores aprovem ou rejeitem pedidos, o financeiro realize pagamentos e administradores gerenciem categorias e usuarios. A aplicacao roda localmente com SQLite, sem servicos externos obrigatorios.

## Stack utilizada

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- SQLite
- Zod
- JWT
- bcrypt
- Jest
- Supertest

### Frontend

- Vite
- React
- TypeScript
- React Router
- Context API
- Axios
- Chakra UI
- Vitest
- React Testing Library

## Requisitos de ambiente

- Node.js 20 ou superior
- npm 10 ou superior
- Git

O projeto foi validado localmente com:

```powershell
node -v
npm -v
```

Tambem nao e necessario instalar SQLite manualmente; o banco e um arquivo local gerenciado pelo Prisma.

## Estrutura do monorepo

```text
controle-reembolsos/
  backend/
    prisma/
    src/
  frontend/
    src/
  package.json
  package-lock.json
  README.md
```

- `backend`: API REST com Express, Prisma e regras de negocio.
- `frontend`: SPA React com rotas protegidas, telas e integracao com a API.
- Raiz do projeto: scripts npm com workspaces para rodar backend e frontend juntos.

## Instalacao

Abra um terminal na pasta raiz do projeto:

```powershell
cd controle-reembolsos
npm install
```

Esse comando instala as dependencias do backend e do frontend via npm workspaces.

## Configuracao de ambiente

Crie os arquivos `.env` a partir dos exemplos.

Na pasta raiz `controle-reembolsos`, rode:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

No Linux/macOS, o equivalente e:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### backend/.env

```env
NODE_ENV=development
PORT=3333
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-local-development"
CORS_ORIGIN="http://localhost:5173"
```

### frontend/.env

```env
VITE_API_URL="http://localhost:3333"
```

## Banco de dados, migrations e seed

Na raiz `controle-reembolsos`, rode:

```powershell
npm run prisma:migrate
npm run prisma:seed
```

O banco SQLite fica em:

```text
backend/prisma/dev.db
```

O seed cria usuarios de teste e categorias iniciais.

## Como iniciar o projeto

### Opcao 1: iniciar backend e frontend juntos

Use um terminal na raiz `controle-reembolsos`:

```powershell
npm run dev
```

URLs:

```text
Backend:  http://localhost:3333
Frontend: http://localhost:5173
Health:   http://localhost:3333/health
```

### Opcao 2: iniciar separadamente

Terminal 1, na raiz `controle-reembolsos`:

```powershell
npm run dev:backend
```

Terminal 2, na raiz `controle-reembolsos`:

```powershell
npm run dev:frontend
```

## Como rodar testes

Na raiz `controle-reembolsos`:

```powershell
npm test
```

Esse comando roda:

- testes de backend com Jest e Supertest;
- testes de frontend com Vitest e React Testing Library.

Para rodar separadamente:

```powershell
npm test -w backend
npm test -w frontend
```

## Outros comandos uteis

Na raiz `controle-reembolsos`:

```powershell
npm run typecheck
npm run build
npm run prisma:generate
```

No backend:

```powershell
npm run prisma:studio -w backend
```

## Usuarios de teste

Todos os usuarios criados pelo seed usam a senha:

```text
Senha@123
```

| Perfil | Email | Senha |
| --- | --- | --- |
| COLABORADOR | colaborador@teste.com | Senha@123 |
| GESTOR | gestor@teste.com | Senha@123 |
| FINANCEIRO | financeiro@teste.com | Senha@123 |
| ADMIN | admin@teste.com | Senha@123 |

O cadastro publico da aplicacao cria apenas usuarios `COLABORADOR`. Os perfis `GESTOR`, `FINANCEIRO` e `ADMIN` ficam disponiveis pelos dados do seed.

## Fluxo manual sugerido para avaliacao

1. Entrar como `colaborador@teste.com`.
2. Criar uma nova solicitacao em `Nova solicitacao`.
3. Adicionar anexo simulado enquanto a solicitacao estiver em `RASCUNHO`.
4. Enviar a solicitacao.
5. Sair e entrar como `gestor@teste.com`.
6. Aprovar ou rejeitar solicitacoes `ENVIADAS`.
7. Se aprovar, sair e entrar como `financeiro@teste.com`.
8. Pagar solicitacoes `APROVADAS`.
9. Entrar como `admin@teste.com`.
10. Gerenciar categorias, ativando e inativando registros.

## Perfis e permissoes

### COLABORADOR

- Cria solicitacoes.
- Lista apenas suas proprias solicitacoes.
- Edita apenas solicitacoes proprias em `RASCUNHO`.
- Envia solicitacoes de `RASCUNHO` para `ENVIADO`.
- Cancela solicitacoes proprias em `RASCUNHO`.
- Adiciona anexos simulados apenas em solicitacoes proprias em `RASCUNHO`.

### GESTOR

- Lista solicitacoes com status `ENVIADO`.
- Aprova solicitacoes `ENVIADAS`.
- Rejeita solicitacoes `ENVIADAS`, com justificativa obrigatoria.

### FINANCEIRO

- Lista solicitacoes com status `APROVADO`.
- Paga solicitacoes `APROVADAS`.

### ADMIN

- Visualiza dados gerais.
- Lista usuarios.
- Cria, edita, ativa e inativa categorias.

## Status e transicoes

| Acao | Transicao | Perfil |
| --- | --- | --- |
| Criar solicitacao | inicial `RASCUNHO` | COLABORADOR |
| Enviar | `RASCUNHO` -> `ENVIADO` | COLABORADOR dono |
| Aprovar | `ENVIADO` -> `APROVADO` | GESTOR |
| Rejeitar | `ENVIADO` -> `REJEITADO` | GESTOR |
| Pagar | `APROVADO` -> `PAGO` | FINANCEIRO |
| Cancelar | `RASCUNHO` -> `CANCELADO` | COLABORADOR dono |

Transicoes invalidas retornam erro HTTP `400`. Perfis sem permissao retornam `403`.

## Endpoints principais

Todas as rotas protegidas usam o header:

```http
Authorization: Bearer <token>
```

### Health

| Metodo | Rota | Descricao |
| --- | --- | --- |
| GET | `/health` | Verifica se a API esta online |

### Autenticacao

| Metodo | Rota | Descricao |
| --- | --- | --- |
| POST | `/auth/login` | Autentica email/senha e retorna token JWT |

Body:

```json
{
  "email": "admin@teste.com",
  "password": "Senha@123"
}
```

### Usuarios

| Metodo | Rota | Perfil | Descricao |
| --- | --- | --- | --- |
| POST | `/users` | Publico | Cria usuario `COLABORADOR` com senha hasheada |
| GET | `/users` | ADMIN | Lista usuarios sem senha |

Body de criacao:

```json
{
  "name": "Novo Usuario",
  "email": "novo@teste.com",
  "password": "Senha@123"
}
```

A API ignora qualquer tentativa de definir perfil privilegiado no cadastro publico e sempre cria o usuario como `COLABORADOR`.

### Categorias

| Metodo | Rota | Perfil | Descricao |
| --- | --- | --- | --- |
| GET | `/categories` | Autenticado | Lista categorias |
| POST | `/categories` | ADMIN | Cria categoria |
| PUT | `/categories/:id` | ADMIN | Edita nome e status ativo/inativo |

Body de criacao/edicao:

```json
{
  "name": "Transporte",
  "active": true
}
```

Categorias inativas nao aparecem como opcao para novas solicitacoes no frontend e nao podem ser usadas em novas solicitacoes pela API.

### Solicitacoes de reembolso

| Metodo | Rota | Perfil | Descricao |
| --- | --- | --- | --- |
| GET | `/reimbursements` | Autenticado | Lista solicitacoes conforme perfil |
| POST | `/reimbursements` | COLABORADOR | Cria solicitacao em `RASCUNHO` |
| GET | `/reimbursements/:id` | Autenticado com acesso | Exibe detalhe da solicitacao |
| PUT | `/reimbursements/:id` | COLABORADOR dono | Edita solicitacao em `RASCUNHO` |

Body de criacao/edicao:

```json
{
  "categoriaId": "id-da-categoria",
  "descricao": "Almoco em viagem",
  "valor": 50.75,
  "dataDespesa": "2026-05-01T00:00:00.000Z"
}
```

### Transicoes de status

| Metodo | Rota | Perfil | Descricao |
| --- | --- | --- | --- |
| POST | `/reimbursements/:id/submit` | COLABORADOR dono | Envia solicitacao em rascunho |
| POST | `/reimbursements/:id/approve` | GESTOR | Aprova solicitacao enviada |
| POST | `/reimbursements/:id/reject` | GESTOR | Rejeita solicitacao enviada |
| POST | `/reimbursements/:id/pay` | FINANCEIRO | Marca solicitacao aprovada como paga |
| POST | `/reimbursements/:id/cancel` | COLABORADOR dono | Cancela solicitacao em rascunho |

Body de rejeicao:

```json
{
  "justificativaRejeicao": "Comprovante invalido"
}
```

### Historico e anexos

| Metodo | Rota | Perfil | Descricao |
| --- | --- | --- | --- |
| GET | `/reimbursements/:id/history` | Autenticado com acesso | Lista historico da solicitacao |
| GET | `/reimbursements/:id/attachments` | Autenticado com acesso | Lista anexos simulados |
| POST | `/reimbursements/:id/attachments` | COLABORADOR dono | Cria anexo simulado em `RASCUNHO` |

Body de anexo simulado:

```json
{
  "nomeArquivo": "comprovante.pdf",
  "urlArquivo": "https://exemplo.com/comprovante.pdf",
  "tipoArquivo": "PDF"
}
```

Tipos permitidos:

```text
PDF, JPG, JPEG, PNG
```

## Formato padrao de erro

A API retorna erros no formato:

```json
{
  "message": "Validation error",
  "statusCode": 400,
  "error": "Bad Request"
}
```

Status usados:

- `400`: validacao ou regra de negocio invalida;
- `401`: autenticacao ausente ou invalida;
- `403`: perfil sem permissao;
- `404`: recurso nao encontrado;
- `500`: erro inesperado.

## Funcionalidades implementadas

- Login com JWT.
- Persistencia de sessao no frontend com Context API e localStorage.
- Cadastro publico de usuarios colaboradores e listagem de usuarios para ADMIN.
- RBAC no backend e protecao de rotas no frontend.
- CRUD de categorias sem delete fisico.
- Ativacao e inativacao de categorias.
- Criacao, listagem, detalhe e edicao de solicitacoes.
- Listagem de solicitacoes filtrada por perfil.
- Transicoes de status com regras por perfil.
- Justificativa obrigatoria para rejeicao.
- Historico/auditoria de acoes.
- Anexos simulados.
- Validacoes com Zod no backend.
- Validacoes amigaveis no frontend.
- Testes de integracao no backend.
- Testes essenciais no frontend.
- UI responsiva com Chakra UI.

## Funcionalidades opcionais implementadas

- Soft delete de categorias por campo `active`.
- Historico de auditoria por acao.
- Anexos simulados sem storage externo.
- Testes frontend com React Testing Library.
- Tela administrativa para categorias.
- Feedback visual com loading, erros, estados vazios e toasts.

## Decisoes tecnicas

- Arquitetura simples em monorepo, adequada para desafio de estagio.
- Sem Clean Architecture, DDD ou microsservicos para evitar complexidade desnecessaria.
- Backend organizado por rotas, controllers, schemas, middlewares e Prisma Client.
- Prisma com SQLite para facilitar avaliacao local.
- Zod usado para validar entrada da API.
- JWT usado para autenticacao stateless.
- bcrypt usado para hash de senhas.
- Cadastro publico limitado a `COLABORADOR`; perfis privilegiados sao criados apenas pelo seed.
- Frontend com Context API para manter usuario, token e perfil.
- Axios centralizado para enviar `Authorization: Bearer <token>`.
- Frontend esconde acoes conforme perfil/status, mas a API continua sendo a autoridade das regras.
- Upload real nao foi implementado porque o desafio permite anexo simulado.

## Pendencias conhecidas

- Nao ha upload real para storage externo.
- Nao ha paginacao, filtros avancados ou ordenacao customizada.
- Nao ha recuperacao de senha.
- Nao ha refresh token.
- Nao ha deploy configurado.
- Nao ha testes end-to-end com navegador real.

Essas pendencias foram deixadas fora para manter o escopo claro, local e facil de avaliar.

## Checklist rapido para avaliacao

Na raiz `controle-reembolsos`:

```powershell
npm install
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Depois abra:

```text
http://localhost:5173/login
```

Entre com:

```text
admin@teste.com / Senha@123
```

Para validar qualidade:

```powershell
npm run typecheck
npm test
npm run build
```
