# Controle de Reembolsos

Aplicação fullstack para controle de solicitações de reembolso, desenvolvida como desafio técnico de estágio.

O sistema permite que colaboradores criem solicitações, gestores aprovem ou rejeitem pedidos, o financeiro realize pagamentos e administradores gerenciem categorias e usuários. A aplicação roda localmente com SQLite.

## Stack

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

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- Git

Não é necessário instalar SQLite separadamente. O banco é um arquivo local gerenciado pelo Prisma.

## Estrutura

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

## Instalação

Na raiz `controle-reembolsos`:

```powershell
npm install
```

## Configuração de ambiente

Crie os arquivos `.env` a partir dos exemplos.

No Windows, na raiz `controle-reembolsos`:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

No Linux/macOS:

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

## Banco de dados e seed

Na raiz `controle-reembolsos`:

```powershell
npm run prisma:migrate
npm run prisma:seed
```

O banco SQLite fica em:

```text
backend/prisma/dev.db
```

O seed cria usuários de teste e categorias iniciais.

## Executando o projeto

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

Terminal 1, na raiz `controle-reembolsos`:

```powershell
npm run dev:backend
```

Terminal 2, na raiz `controle-reembolsos`:

```powershell
npm run dev:frontend
```

## Testes, typecheck e build

Na raiz `controle-reembolsos`:

```powershell
npm run typecheck
npm test
npm run build
```

Para rodar testes separadamente:

```powershell
npm test -w backend
npm test -w frontend
```

Outros comandos úteis:

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

O cadastro público cria apenas usuários `COLABORADOR`. Os perfis `GESTOR`, `FINANCEIRO` e `ADMIN` ficam disponíveis pelo seed.

## Fluxo manual sugerido

1. Entrar como `colaborador@teste.com`.
2. Criar uma solicitação em `Nova solicitação`.
3. Adicionar um anexo simulado enquanto a solicitação estiver em `RASCUNHO`.
4. Enviar a solicitação.
5. Sair e entrar como `gestor@teste.com`.
6. Aprovar ou rejeitar solicitações `ENVIADAS`.
7. Se aprovar, sair e entrar como `financeiro@teste.com`.
8. Pagar solicitações `APROVADAS`.
9. Entrar como `admin@teste.com`.
10. Criar, editar, ativar e inativar categorias.

## Perfis e permissões

| Perfil | Permissões principais |
| --- | --- |
| COLABORADOR | Cria solicitações, lista apenas as próprias, edita/envia/cancela em `RASCUNHO` e adiciona anexos simulados em solicitações próprias em `RASCUNHO`. |
| GESTOR | Lista solicitações `ENVIADAS`, aprova e rejeita com justificativa obrigatória. |
| FINANCEIRO | Lista solicitações `APROVADAS` e marca como pagas. |
| ADMIN | Visualiza dados gerais, lista usuários e gerencia categorias. |

## Status e transições

| Ação | Transição | Perfil |
| --- | --- | --- |
| Criar solicitação | inicial `RASCUNHO` | COLABORADOR |
| Enviar | `RASCUNHO` -> `ENVIADO` | COLABORADOR dono |
| Aprovar | `ENVIADO` -> `APROVADO` | GESTOR |
| Rejeitar | `ENVIADO` -> `REJEITADO` | GESTOR |
| Pagar | `APROVADO` -> `PAGO` | FINANCEIRO |
| Cancelar | `RASCUNHO` -> `CANCELADO` | COLABORADOR dono |

Transições inválidas retornam `400`. Perfis sem permissão retornam `403`.

## Endpoints principais

Rotas protegidas usam:

```http
Authorization: Bearer <token>
```

### Autenticação e usuários

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| GET | `/health` | Público | Verifica se a API está online |
| POST | `/auth/login` | Público | Autentica email/senha e retorna token JWT |
| POST | `/users` | Público | Cria usuário `COLABORADOR` com senha hasheada |
| GET | `/users` | ADMIN | Lista usuários sem senha |

Body de login:

```json
{
  "email": "admin@teste.com",
  "password": "Senha@123"
}
```

Body de cadastro:

```json
{
  "name": "Novo Usuário",
  "email": "novo@teste.com",
  "password": "Senha@123"
}
```

Mesmo que o cliente envie um perfil privilegiado no cadastro público, a API cria o usuário como `COLABORADOR`.

### Categorias

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| GET | `/categories` | Autenticado | Lista categorias |
| POST | `/categories` | ADMIN | Cria categoria |
| PUT | `/categories/:id` | ADMIN | Edita nome e status ativo/inativo |

```json
{
  "name": "Transporte",
  "active": true
}
```

Categorias inativas não aparecem como opção para novas solicitações no frontend e não podem ser usadas em novas solicitações pela API.

### Solicitações

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| GET | `/reimbursements` | Autenticado | Lista solicitações conforme o perfil |
| POST | `/reimbursements` | COLABORADOR | Cria solicitação em `RASCUNHO` |
| GET | `/reimbursements/:id` | Autenticado com acesso | Exibe detalhe da solicitação |
| PUT | `/reimbursements/:id` | COLABORADOR dono | Edita solicitação em `RASCUNHO` |

```json
{
  "categoriaId": "id-da-categoria",
  "descricao": "Almoço em viagem",
  "valor": 50.75,
  "dataDespesa": "2026-05-01T00:00:00.000Z"
}
```

### Transições, histórico e anexos

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| POST | `/reimbursements/:id/submit` | COLABORADOR dono | Envia solicitação em rascunho |
| POST | `/reimbursements/:id/approve` | GESTOR | Aprova solicitação enviada |
| POST | `/reimbursements/:id/reject` | GESTOR | Rejeita solicitação enviada |
| POST | `/reimbursements/:id/pay` | FINANCEIRO | Marca solicitação aprovada como paga |
| POST | `/reimbursements/:id/cancel` | COLABORADOR dono | Cancela solicitação em rascunho |
| GET | `/reimbursements/:id/history` | Autenticado com acesso | Lista histórico da solicitação |
| GET | `/reimbursements/:id/attachments` | Autenticado com acesso | Lista anexos simulados |
| POST | `/reimbursements/:id/attachments` | COLABORADOR dono | Cria anexo simulado em `RASCUNHO` |

Body de rejeição:

```json
{
  "justificativaRejeicao": "Comprovante inválido"
}
```

Body de anexo simulado:

```json
{
  "nomeArquivo": "comprovante.pdf",
  "urlArquivo": "https://exemplo.com/comprovante.pdf",
  "tipoArquivo": "PDF"
}
```

Tipos permitidos: `PDF`, `JPG`, `JPEG`, `PNG`.

## Formato de erro

A API retorna erros no formato:

```json
{
  "message": "Validation error",
  "statusCode": 400,
  "error": "Bad Request"
}
```

Status usados:

- `400`: validação ou regra de negócio inválida;
- `401`: autenticação ausente ou inválida;
- `403`: perfil sem permissão;
- `404`: recurso não encontrado;
- `500`: erro inesperado.

## Funcionalidades implementadas

- Login com JWT.
- Cadastro público restrito a `COLABORADOR`.
- Senhas armazenadas com bcrypt.
- Context API e localStorage para sessão no frontend.
- Rotas públicas e privadas com React Router.
- RBAC no backend e proteção de rotas no frontend.
- CRUD de categorias com ativação/inativação.
- CRUD de solicitações de reembolso.
- Listagem de solicitações por perfil.
- Transições de status com permissões por perfil.
- Rejeição com justificativa obrigatória.
- Histórico de ações da solicitação.
- Anexos simulados com tipo permitido.
- Validações com Zod no backend.
- Mensagens de erro, loading, sucesso e estados vazios no frontend.
- Testes de integração no backend.
- Testes de frontend com React Testing Library.
- README com instruções de execução e usuários de teste.

## Funcionalidades opcionais implementadas

- Soft delete de categorias por campo `active`.
- Seeds iniciais de usuários e categorias.
- Dashboard com totais básicos.
- Testes adicionais para regras de negócio, histórico, anexos e tratamento de erros.

## Decisões técnicas

- Arquitetura simples em monorepo, adequada ao escopo do desafio.
- Sem Clean Architecture, DDD ou microsserviços.
- Backend organizado por rotas, controllers, schemas, middlewares e Prisma Client.
- Prisma com SQLite para facilitar avaliação local.
- Axios centralizado para enviar `Authorization: Bearer <token>`.
- O frontend esconde ações por perfil/status, mas a API continua sendo a autoridade.
- Upload real não foi implementado porque o desafio permite anexo simulado.

## Fora do escopo intencionalmente

- Upload real para storage externo.
- Paginação, filtros avançados e ordenação customizada.
- Recuperação de senha.
- Refresh token.
- Docker Compose.
- Deploy.
- Testes end-to-end com navegador real.

Esses itens foram deixados fora para manter o projeto simples, local e fácil de avaliar.

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
