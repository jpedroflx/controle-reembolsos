import { ReimbursementStatus, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";

import { app } from "../app";
import { prisma } from "../lib/prisma";

const testPassword = "Senha@123";
const requesterFilter = "differentials.";
const testUsers = {
  admin: "differentials.admin.integration@teste.com",
  collaborator: "differentials.colaborador.integration@teste.com",
  finance: "differentials.financeiro.integration@teste.com",
  manager: "differentials.gestor.integration@teste.com",
  otherCollaborator: "differentials.outro-colaborador.integration@teste.com"
};

type TestUserKey = keyof typeof testUsers;

type SummaryResponse = {
  totalSolicitacoes: number;
  valorTotal: number;
  porStatus: Array<{
    status: ReimbursementStatus;
    quantidade: number;
    valorTotal: number;
  }>;
  porCategoria: Array<{
    categoriaId: string;
    categoriaNome: string;
    quantidade: number;
    valorTotal: number;
  }>;
};

const tokens = {} as Record<TestUserKey, string>;
const userIds = {} as Record<TestUserKey, string>;
let categoryAId: string;
let categoryBId: string;
let limitedCategoryId: string;
let attachmentRequiredCategoryId: string;

async function upsertTestUser(email: string, role: Role) {
  const passwordHash = await bcrypt.hash(testPassword, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name: `Diferenciais ${role}`,
      passwordHash,
      role
    },
    create: {
      name: `Diferenciais ${role}`,
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

function auth(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

function dateOnlyDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);

  return date.toISOString().slice(0, 10);
}

function getFutureExpenseDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString().slice(0, 10);
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
      categoriaId: categoryAId,
      descricao: "Despesa diferencial",
      valor: 100,
      dataDespesa: dateOnlyDaysAgo(3),
      ...data
    });

  expect(response.status).toBe(201);

  return response.body as {
    id: string;
    categoriaId: string;
    solicitanteId: string;
    status: ReimbursementStatus;
    valor: number;
  };
}

async function createStoredRequest({
  amount,
  categoryId = categoryAId,
  daysAgo = 3,
  requesterId = userIds.collaborator,
  status
}: {
  amount: number;
  categoryId?: string;
  daysAgo?: number;
  requesterId?: string;
  status: ReimbursementStatus;
}) {
  return prisma.reimbursementRequest.create({
    data: {
      amount,
      categoryId,
      description: `Diferencial ${status} ${amount}`,
      expenseDate: new Date(`${dateOnlyDaysAgo(daysAgo)}T00:00:00.000Z`),
      requesterId,
      status
    }
  });
}

function statusEntry(summary: SummaryResponse, status: ReimbursementStatus) {
  const entry = summary.porStatus.find((item) => item.status === status);

  if (!entry) {
    throw new Error(`Status ${status} not found in summary`);
  }

  return entry;
}

function categoryEntry(summary: SummaryResponse, categoryId: string) {
  const entry = summary.porCategoria.find((item) => item.categoriaId === categoryId);

  if (!entry) {
    throw new Error(`Category ${categoryId} not found in summary`);
  }

  return entry;
}

describe("reimbursement differentials", () => {
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

    const [categoryA, categoryB, limitedCategory, attachmentRequiredCategory] = await Promise.all([
      prisma.category.upsert({
        where: { name: "Categoria diferenciais A" },
        update: { active: true, attachmentRequiredAboveAmount: null, maxAmount: null },
        create: { name: "Categoria diferenciais A", active: true, attachmentRequiredAboveAmount: null, maxAmount: null },
        select: { id: true }
      }),
      prisma.category.upsert({
        where: { name: "Categoria diferenciais B" },
        update: { active: true, attachmentRequiredAboveAmount: null, maxAmount: null },
        create: { name: "Categoria diferenciais B", active: true, attachmentRequiredAboveAmount: null, maxAmount: null },
        select: { id: true }
      }),
      prisma.category.upsert({
        where: { name: "Categoria diferenciais limitada" },
        update: { active: true, attachmentRequiredAboveAmount: null, maxAmount: 100 },
        create: {
          name: "Categoria diferenciais limitada",
          active: true,
          attachmentRequiredAboveAmount: null,
          maxAmount: 100
        },
        select: { id: true }
      }),
      prisma.category.upsert({
        where: { name: "Categoria diferenciais exige anexo" },
        update: { active: true, attachmentRequiredAboveAmount: 100, maxAmount: null },
        create: {
          name: "Categoria diferenciais exige anexo",
          active: true,
          attachmentRequiredAboveAmount: 100,
          maxAmount: null
        },
        select: { id: true }
      })
    ]);

    categoryAId = categoryA.id;
    categoryBId = categoryB.id;
    limitedCategoryId = limitedCategory.id;
    attachmentRequiredCategoryId = attachmentRequiredCategory.id;

    await Promise.all(
      (Object.keys(testUsers) as TestUserKey[]).map(async (key) => {
        tokens[key] = await login(testUsers[key]);
      })
    );
  });

  beforeEach(async () => {
    await cleanupTestRequests();
  });

  afterAll(async () => {
    await cleanupTestRequests();
    await prisma.$disconnect();
  });

  it("returns paginated reimbursement results with metadata", async () => {
    await createStoredRequest({ amount: 10, status: ReimbursementStatus.RASCUNHO });
    const secondRequest = await createStoredRequest({ amount: 20, status: ReimbursementStatus.RASCUNHO });
    await createStoredRequest({ amount: 30, status: ReimbursementStatus.RASCUNHO });

    const response = await request(app)
      .get("/reimbursements")
      .set(auth(tokens.admin))
      .query({
        page: 2,
        pageSize: 1,
        solicitante: requesterFilter,
        sortBy: "valor",
        sortOrder: "asc",
        status: ReimbursementStatus.RASCUNHO
      });

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({
      page: 2,
      pageSize: 1,
      total: 3,
      totalPages: 3
    });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: secondRequest.id,
      valor: 20
    });
  });

  it("filters reimbursements by status", async () => {
    await createStoredRequest({ amount: 100, status: ReimbursementStatus.RASCUNHO });
    const sentRequest = await createStoredRequest({ amount: 200, status: ReimbursementStatus.ENVIADO });

    const response = await request(app)
      .get("/reimbursements")
      .set(auth(tokens.admin))
      .query({
        solicitante: requesterFilter,
        status: ReimbursementStatus.ENVIADO
      });

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        id: sentRequest.id,
        status: ReimbursementStatus.ENVIADO
      })
    ]);
  });

  it("filters reimbursements by category", async () => {
    await createStoredRequest({ amount: 100, categoryId: categoryAId, status: ReimbursementStatus.RASCUNHO });
    const categoryBRequest = await createStoredRequest({
      amount: 200,
      categoryId: categoryBId,
      status: ReimbursementStatus.RASCUNHO
    });

    const response = await request(app)
      .get("/reimbursements")
      .set(auth(tokens.admin))
      .query({
        categoriaId: categoryBId,
        solicitante: requesterFilter
      });

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        categoriaId: categoryBId,
        id: categoryBRequest.id
      })
    ]);
  });

  it("searches reimbursements by requester name or email without bypassing RBAC", async () => {
    await createStoredRequest({
      amount: 100,
      requesterId: userIds.collaborator,
      status: ReimbursementStatus.RASCUNHO
    });
    const otherRequest = await createStoredRequest({
      amount: 200,
      requesterId: userIds.otherCollaborator,
      status: ReimbursementStatus.RASCUNHO
    });

    const adminResponse = await request(app)
      .get("/reimbursements")
      .set(auth(tokens.admin))
      .query({
        solicitante: testUsers.otherCollaborator
      });

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.meta.total).toBe(1);
    expect(adminResponse.body.data[0]).toMatchObject({
      id: otherRequest.id,
      solicitanteId: userIds.otherCollaborator
    });

    const collaboratorResponse = await request(app)
      .get("/reimbursements")
      .set(auth(tokens.collaborator))
      .query({
        solicitante: testUsers.otherCollaborator
      });

    expect(collaboratorResponse.status).toBe(200);
    expect(collaboratorResponse.body).toMatchObject({
      data: [],
      meta: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0
      }
    });
  });

  it("sorts reimbursements by expense date and amount", async () => {
    const oldestRequest = await createStoredRequest({ amount: 200, daysAgo: 10, status: ReimbursementStatus.RASCUNHO });
    const mostRecentRequest = await createStoredRequest({
      amount: 100,
      daysAgo: 1,
      status: ReimbursementStatus.RASCUNHO
    });
    const highestAmountRequest = await createStoredRequest({
      amount: 300,
      daysAgo: 5,
      status: ReimbursementStatus.RASCUNHO
    });

    const byDateResponse = await request(app)
      .get("/reimbursements")
      .set(auth(tokens.admin))
      .query({
        solicitante: requesterFilter,
        sortBy: "dataDespesa",
        sortOrder: "asc"
      });

    expect(byDateResponse.status).toBe(200);
    expect(byDateResponse.body.data.map((item: { id: string }) => item.id)).toEqual([
      oldestRequest.id,
      highestAmountRequest.id,
      mostRecentRequest.id
    ]);

    const byAmountResponse = await request(app)
      .get("/reimbursements")
      .set(auth(tokens.admin))
      .query({
        solicitante: requesterFilter,
        sortBy: "valor",
        sortOrder: "desc"
      });

    expect(byAmountResponse.status).toBe(200);
    expect(byAmountResponse.body.data.map((item: { id: string }) => item.id)).toEqual([
      highestAmountRequest.id,
      oldestRequest.id,
      mostRecentRequest.id
    ]);
  });

  it("returns dashboard summary totals for visible reimbursements", async () => {
    await createStoredRequest({
      amount: 100,
      categoryId: categoryAId,
      status: ReimbursementStatus.RASCUNHO
    });
    await createStoredRequest({
      amount: 200,
      categoryId: categoryAId,
      requesterId: userIds.otherCollaborator,
      status: ReimbursementStatus.ENVIADO
    });
    await createStoredRequest({
      amount: 300,
      categoryId: categoryBId,
      status: ReimbursementStatus.APROVADO
    });

    const response = await request(app)
      .get("/reimbursements/summary")
      .set(auth(tokens.admin))
      .query({
        solicitante: requesterFilter
      });
    const summary = response.body as SummaryResponse;

    expect(response.status).toBe(200);
    expect(summary.totalSolicitacoes).toBe(3);
    expect(summary.valorTotal).toBe(600);
    expect(statusEntry(summary, ReimbursementStatus.RASCUNHO)).toMatchObject({
      quantidade: 1,
      valorTotal: 100
    });
    expect(statusEntry(summary, ReimbursementStatus.ENVIADO)).toMatchObject({
      quantidade: 1,
      valorTotal: 200
    });
    expect(statusEntry(summary, ReimbursementStatus.APROVADO)).toMatchObject({
      quantidade: 1,
      valorTotal: 300
    });
    expect(categoryEntry(summary, categoryAId)).toMatchObject({
      quantidade: 2,
      valorTotal: 300
    });
    expect(categoryEntry(summary, categoryBId)).toMatchObject({
      quantidade: 1,
      valorTotal: 300
    });
  });

  it("blocks future expense dates on create and update", async () => {
    const createResponse = await request(app).post("/reimbursements").set(auth(tokens.collaborator)).send({
      categoriaId: categoryAId,
      dataDespesa: getFutureExpenseDate(),
      descricao: "Data futura",
      valor: 100
    });

    expect(createResponse.status).toBe(400);
    expect(createResponse.body).toMatchObject({
      message: "Expense date cannot be in the future",
      statusCode: 400,
      error: "Bad Request"
    });

    const reimbursement = await createDraftRequest();

    const updateResponse = await request(app)
      .put(`/reimbursements/${reimbursement.id}`)
      .set(auth(tokens.collaborator))
      .send({
        dataDespesa: getFutureExpenseDate()
      });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body).toMatchObject({
      message: "Expense date cannot be in the future",
      statusCode: 400,
      error: "Bad Request"
    });
  });

  it("blocks reimbursement amounts above the category limit on create and update", async () => {
    const createResponse = await request(app).post("/reimbursements").set(auth(tokens.collaborator)).send({
      categoriaId: limitedCategoryId,
      dataDespesa: dateOnlyDaysAgo(3),
      descricao: "Acima do limite",
      valor: 101
    });

    expect(createResponse.status).toBe(400);
    expect(createResponse.body).toMatchObject({
      message: "Reimbursement amount exceeds category limit",
      statusCode: 400,
      error: "Bad Request"
    });

    const reimbursement = await createDraftRequest(tokens.collaborator, {
      categoriaId: limitedCategoryId,
      valor: 80
    });

    const updateResponse = await request(app)
      .put(`/reimbursements/${reimbursement.id}`)
      .set(auth(tokens.collaborator))
      .send({
        valor: 101
      });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body).toMatchObject({
      message: "Reimbursement amount exceeds category limit",
      statusCode: 400,
      error: "Bad Request"
    });
  });

  it("requires an attachment before submitting above the category threshold", async () => {
    const reimbursement = await createDraftRequest(tokens.collaborator, {
      categoriaId: attachmentRequiredCategoryId,
      valor: 150
    });

    const blockedResponse = await request(app)
      .post(`/reimbursements/${reimbursement.id}/submit`)
      .set(auth(tokens.collaborator));

    expect(blockedResponse.status).toBe(400);
    expect(blockedResponse.body).toMatchObject({
      message: "Attachment is required to submit reimbursements above category threshold",
      statusCode: 400,
      error: "Bad Request"
    });

    await request(app)
      .post(`/reimbursements/${reimbursement.id}/attachments`)
      .set(auth(tokens.collaborator))
      .send({
        nomeArquivo: "comprovante.pdf",
        tipoArquivo: "PDF",
        urlArquivo: "https://example.com/comprovante.pdf"
      })
      .expect(201);

    const submitResponse = await request(app)
      .post(`/reimbursements/${reimbursement.id}/submit`)
      .set(auth(tokens.collaborator));

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body).toMatchObject({
      id: reimbursement.id,
      status: ReimbursementStatus.ENVIADO
    });
  });
});
