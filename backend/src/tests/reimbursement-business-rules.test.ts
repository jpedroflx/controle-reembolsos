import { ReimbursementStatus, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";

import { app } from "../app";
import { prisma } from "../lib/prisma";

const testPassword = "Senha@123";
const testUsers = {
  admin: "rules.admin.integration@teste.com",
  collaborator: "rules.colaborador.integration@teste.com",
  otherCollaborator: "rules.outro-colaborador.integration@teste.com",
  manager: "rules.gestor.integration@teste.com",
  finance: "rules.financeiro.integration@teste.com"
};

type TestUserKey = keyof typeof testUsers;

const tokens = {} as Record<TestUserKey, string>;
const userIds = {} as Record<TestUserKey, string>;
let activeCategoryId: string;
let inactiveCategoryId: string;

async function upsertTestUser(email: string, role: Role) {
  const passwordHash = await bcrypt.hash(testPassword, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name: `Usuario ${role}`,
      passwordHash,
      role
    },
    create: {
      name: `Usuario ${role}`,
      email,
      passwordHash,
      role
    },
    select: {
      id: true
    }
  });
}

async function login(email: string) {
  const response = await request(app).post("/auth/login").send({
    email,
    password: testPassword
  });

  expect(response.status).toBe(200);

  return response.body.token as string;
}

async function cleanupTestRequests() {
  await prisma.reimbursementRequest.deleteMany({
    where: {
      requesterId: {
        in: Object.values(userIds).filter(Boolean)
      }
    }
  });
}

function auth(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function createDraftRequest(
  token = tokens.collaborator,
  data: Partial<{
    categoriaId: string;
    descricao: string;
    valor: number;
    dataDespesa: string;
  }> = {}
) {
  const response = await request(app)
    .post("/reimbursements")
    .set(auth(token))
    .send({
      categoriaId: activeCategoryId,
      descricao: "Despesa de teste",
      valor: 100,
      dataDespesa: "2026-05-01",
      ...data
    });

  expect(response.status).toBe(201);

  return response.body as {
    id: string;
    solicitanteId: string;
    status: ReimbursementStatus;
    historico: Array<{ acao: string }>;
  };
}

describe("reimbursement business rules", () => {
  beforeAll(async () => {
    const [admin, collaborator, otherCollaborator, manager, finance] = await Promise.all([
      upsertTestUser(testUsers.admin, Role.ADMIN),
      upsertTestUser(testUsers.collaborator, Role.COLABORADOR),
      upsertTestUser(testUsers.otherCollaborator, Role.COLABORADOR),
      upsertTestUser(testUsers.manager, Role.GESTOR),
      upsertTestUser(testUsers.finance, Role.FINANCEIRO)
    ]);

    userIds.admin = admin.id;
    userIds.collaborator = collaborator.id;
    userIds.otherCollaborator = otherCollaborator.id;
    userIds.manager = manager.id;
    userIds.finance = finance.id;

    await cleanupTestRequests();

    const [activeCategory, inactiveCategory] = await Promise.all([
      prisma.category.upsert({
        where: { name: "Categoria ativa regras" },
        update: { active: true },
        create: { name: "Categoria ativa regras", active: true },
        select: { id: true }
      }),
      prisma.category.upsert({
        where: { name: "Categoria inativa regras" },
        update: { active: false },
        create: { name: "Categoria inativa regras", active: false },
        select: { id: true }
      })
    ]);

    activeCategoryId = activeCategory.id;
    inactiveCategoryId = inactiveCategory.id;

    await Promise.all(
      (Object.keys(testUsers) as TestUserKey[]).map(async (key) => {
        tokens[key] = await login(testUsers[key]);
      })
    );
  });

  afterAll(async () => {
    await cleanupTestRequests();
    await prisma.$disconnect();
  });

  it("allows a collaborator to create a valid draft request", async () => {
    const reimbursement = await createDraftRequest();

    expect(reimbursement).toMatchObject({
      solicitanteId: userIds.collaborator,
      status: ReimbursementStatus.RASCUNHO
    });
    expect(reimbursement.historico.at(-1)?.acao).toBe("CREATED");
  });

  it("returns 400 when creating a request with zero amount", async () => {
    const response = await request(app).post("/reimbursements").set(auth(tokens.collaborator)).send({
      categoriaId: activeCategoryId,
      descricao: "Valor invalido",
      valor: 0,
      dataDespesa: "2026-05-01"
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request"
    });
  });

  it("returns 400 when using an inactive category", async () => {
    const response = await request(app).post("/reimbursements").set(auth(tokens.collaborator)).send({
      categoriaId: inactiveCategoryId,
      descricao: "Categoria inativa",
      valor: 100,
      dataDespesa: "2026-05-01"
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: "Category not found or inactive",
      statusCode: 400
    });
  });

  it("lists only the authenticated collaborator's own requests", async () => {
    await cleanupTestRequests();

    const ownRequest = await createDraftRequest(tokens.collaborator, {
      descricao: "Minha despesa"
    });
    const otherRequest = await createDraftRequest(tokens.otherCollaborator, {
      descricao: "Despesa de outra pessoa"
    });

    const response = await request(app).get("/reimbursements").set(auth(tokens.collaborator));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ownRequest.id,
          solicitanteId: userIds.collaborator
        })
      ])
    );
    expect(response.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: otherRequest.id
        })
      ])
    );
    expect(response.body.every((item: { solicitanteId: string }) => item.solicitanteId === userIds.collaborator)).toBe(
      true
    );
  });

  it("blocks a collaborator from editing another collaborator's request", async () => {
    const otherRequest = await createDraftRequest(tokens.otherCollaborator);

    const response = await request(app)
      .put(`/reimbursements/${otherRequest.id}`)
      .set(auth(tokens.collaborator))
      .send({
        descricao: "Tentativa indevida"
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      statusCode: 403,
      error: "Forbidden"
    });
  });

  it("returns 400 when editing outside draft status", async () => {
    const reimbursement = await createDraftRequest();

    await request(app).post(`/reimbursements/${reimbursement.id}/submit`).set(auth(tokens.collaborator)).expect(200);

    const response = await request(app)
      .put(`/reimbursements/${reimbursement.id}`)
      .set(auth(tokens.collaborator))
      .send({
        descricao: "Edicao fora de rascunho"
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: "Only draft reimbursement requests can be edited",
      statusCode: 400
    });
  });

  it("submits a draft request and writes history", async () => {
    const reimbursement = await createDraftRequest();

    const response = await request(app)
      .post(`/reimbursements/${reimbursement.id}/submit`)
      .set(auth(tokens.collaborator));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(ReimbursementStatus.ENVIADO);
    expect(response.body.historico.at(-1)?.acao).toBe("SUBMITTED");
  });

  it("allows a manager to approve only sent requests", async () => {
    const reimbursement = await createDraftRequest();

    const invalidResponse = await request(app)
      .post(`/reimbursements/${reimbursement.id}/approve`)
      .set(auth(tokens.manager));

    expect(invalidResponse.status).toBe(400);

    await request(app).post(`/reimbursements/${reimbursement.id}/submit`).set(auth(tokens.collaborator)).expect(200);

    const response = await request(app).post(`/reimbursements/${reimbursement.id}/approve`).set(auth(tokens.manager));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(ReimbursementStatus.APROVADO);
    expect(response.body.historico.at(-1)?.acao).toBe("APPROVED");
  });

  it("requires a rejection reason and then rejects a sent request", async () => {
    const reimbursement = await createDraftRequest();

    await request(app).post(`/reimbursements/${reimbursement.id}/submit`).set(auth(tokens.collaborator)).expect(200);

    const invalidResponse = await request(app)
      .post(`/reimbursements/${reimbursement.id}/reject`)
      .set(auth(tokens.manager))
      .send({});

    expect(invalidResponse.status).toBe(400);

    const response = await request(app)
      .post(`/reimbursements/${reimbursement.id}/reject`)
      .set(auth(tokens.manager))
      .send({
        justificativaRejeicao: "Comprovante insuficiente"
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(ReimbursementStatus.REJEITADO);
    expect(response.body.justificativaRejeicao).toBe("Comprovante insuficiente");
    expect(response.body.historico.at(-1)?.acao).toBe("REJECTED");
  });

  it("allows finance to pay only approved requests", async () => {
    const reimbursement = await createDraftRequest();

    await request(app).post(`/reimbursements/${reimbursement.id}/submit`).set(auth(tokens.collaborator)).expect(200);

    const invalidResponse = await request(app)
      .post(`/reimbursements/${reimbursement.id}/pay`)
      .set(auth(tokens.finance));

    expect(invalidResponse.status).toBe(400);

    await request(app).post(`/reimbursements/${reimbursement.id}/approve`).set(auth(tokens.manager)).expect(200);

    const response = await request(app).post(`/reimbursements/${reimbursement.id}/pay`).set(auth(tokens.finance));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(ReimbursementStatus.PAGO);
    expect(response.body.historico.at(-1)?.acao).toBe("PAID");
  });

  it("returns 403 for wrong profiles on restricted actions", async () => {
    const reimbursement = await createDraftRequest();

    await request(app).post(`/reimbursements/${reimbursement.id}/submit`).set(auth(tokens.collaborator)).expect(200);

    await request(app).post(`/reimbursements/${reimbursement.id}/approve`).set(auth(tokens.collaborator)).expect(403);
    await request(app).post(`/reimbursements/${reimbursement.id}/reject`).set(auth(tokens.finance)).send({
      justificativaRejeicao: "Perfil errado"
    }).expect(403);

    await request(app).post(`/reimbursements/${reimbursement.id}/approve`).set(auth(tokens.manager)).expect(200);
    await request(app).post(`/reimbursements/${reimbursement.id}/pay`).set(auth(tokens.manager)).expect(403);
  });

  it("returns 404 for a missing reimbursement request", async () => {
    const response = await request(app)
      .get("/reimbursements/id-inexistente")
      .set(auth(tokens.admin));

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      message: "Reimbursement request not found",
      statusCode: 404,
      error: "Not Found"
    });
  });
});
