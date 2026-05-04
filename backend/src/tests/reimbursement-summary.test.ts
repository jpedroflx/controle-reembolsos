import { ReimbursementStatus, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";

import { app } from "../app";
import { prisma } from "../lib/prisma";

const testPassword = "Senha@123";
const testUsers = {
  admin: "summary.admin.integration@teste.com",
  collaborator: "summary.colaborador.integration@teste.com",
  finance: "summary.financeiro.integration@teste.com",
  manager: "summary.gestor.integration@teste.com",
  otherCollaborator: "summary.outro-colaborador.integration@teste.com"
};
const summaryRequesterFilter = "summary.";

type TestUserKey = keyof typeof testUsers;

const tokens = {} as Record<TestUserKey, string>;
const userIds = {} as Record<TestUserKey, string>;
let categoryAId: string;
let categoryBId: string;

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

async function upsertTestUser(email: string, role: Role) {
  const passwordHash = await bcrypt.hash(testPassword, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name: `Resumo ${role}`,
      passwordHash,
      role
    },
    create: {
      name: `Resumo ${role}`,
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

async function cleanupTestRequests() {
  await prisma.reimbursementRequest.deleteMany({
    where: {
      requesterId: {
        in: Object.values(userIds).filter(Boolean)
      }
    }
  });
}

async function createRequest({
  amount,
  categoryId = categoryAId,
  requesterId = userIds.collaborator,
  status
}: {
  amount: number;
  categoryId?: string;
  requesterId?: string;
  status: ReimbursementStatus;
}) {
  return prisma.reimbursementRequest.create({
    data: {
      amount,
      categoryId,
      description: `Resumo ${status} ${amount}`,
      expenseDate: new Date("2026-05-01T00:00:00.000Z"),
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

describe("reimbursement summary", () => {
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

    const [categoryA, categoryB] = await Promise.all([
      prisma.category.upsert({
        where: { name: "Categoria resumo A" },
        update: { active: true },
        create: { name: "Categoria resumo A", active: true },
        select: { id: true }
      }),
      prisma.category.upsert({
        where: { name: "Categoria resumo B" },
        update: { active: true },
        create: { name: "Categoria resumo B", active: true },
        select: { id: true }
      })
    ]);

    categoryAId = categoryA.id;
    categoryBId = categoryB.id;

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

  it("summarizes only the authenticated collaborator's own reimbursements", async () => {
    await createRequest({
      amount: 100,
      requesterId: userIds.collaborator,
      status: ReimbursementStatus.RASCUNHO
    });
    await createRequest({
      amount: 250,
      requesterId: userIds.otherCollaborator,
      status: ReimbursementStatus.RASCUNHO
    });

    const response = await request(app)
      .get("/reimbursements/summary")
      .set(auth(tokens.collaborator))
      .query({ solicitante: summaryRequesterFilter });
    const summary = response.body as SummaryResponse;

    expect(response.status).toBe(200);
    expect(summary.totalSolicitacoes).toBe(1);
    expect(summary.valorTotal).toBe(100);
    expect(statusEntry(summary, ReimbursementStatus.RASCUNHO)).toMatchObject({
      quantidade: 1,
      valorTotal: 100
    });
    expect(categoryEntry(summary, categoryAId)).toMatchObject({
      quantidade: 1,
      valorTotal: 100
    });
  });

  it("summarizes only sent reimbursements for managers", async () => {
    await createRequest({
      amount: 100,
      status: ReimbursementStatus.ENVIADO
    });
    await createRequest({
      amount: 200,
      status: ReimbursementStatus.RASCUNHO
    });
    await createRequest({
      amount: 300,
      requesterId: userIds.otherCollaborator,
      status: ReimbursementStatus.APROVADO
    });

    const response = await request(app)
      .get("/reimbursements/summary")
      .set(auth(tokens.manager))
      .query({ solicitante: summaryRequesterFilter });
    const summary = response.body as SummaryResponse;

    expect(response.status).toBe(200);
    expect(summary.totalSolicitacoes).toBe(1);
    expect(summary.valorTotal).toBe(100);
    expect(statusEntry(summary, ReimbursementStatus.ENVIADO)).toMatchObject({
      quantidade: 1,
      valorTotal: 100
    });
    expect(statusEntry(summary, ReimbursementStatus.RASCUNHO).quantidade).toBe(0);
    expect(statusEntry(summary, ReimbursementStatus.APROVADO).quantidade).toBe(0);
  });

  it("summarizes only approved reimbursements for finance", async () => {
    await createRequest({
      amount: 100,
      status: ReimbursementStatus.ENVIADO
    });
    await createRequest({
      amount: 200,
      requesterId: userIds.otherCollaborator,
      status: ReimbursementStatus.APROVADO
    });

    const response = await request(app)
      .get("/reimbursements/summary")
      .set(auth(tokens.finance))
      .query({ solicitante: summaryRequesterFilter });
    const summary = response.body as SummaryResponse;

    expect(response.status).toBe(200);
    expect(summary.totalSolicitacoes).toBe(1);
    expect(summary.valorTotal).toBe(200);
    expect(statusEntry(summary, ReimbursementStatus.APROVADO)).toMatchObject({
      quantidade: 1,
      valorTotal: 200
    });
    expect(statusEntry(summary, ReimbursementStatus.ENVIADO).quantidade).toBe(0);
  });

  it("summarizes all reimbursements for admins", async () => {
    await createRequest({
      amount: 100,
      categoryId: categoryAId,
      status: ReimbursementStatus.RASCUNHO
    });
    await createRequest({
      amount: 200,
      categoryId: categoryAId,
      requesterId: userIds.otherCollaborator,
      status: ReimbursementStatus.ENVIADO
    });
    await createRequest({
      amount: 300,
      categoryId: categoryBId,
      status: ReimbursementStatus.APROVADO
    });

    const response = await request(app)
      .get("/reimbursements/summary")
      .set(auth(tokens.admin))
      .query({ solicitante: summaryRequesterFilter });
    const summary = response.body as SummaryResponse;

    expect(response.status).toBe(200);
    expect(summary.totalSolicitacoes).toBe(3);
    expect(summary.valorTotal).toBe(600);
    expect(statusEntry(summary, ReimbursementStatus.RASCUNHO).quantidade).toBe(1);
    expect(statusEntry(summary, ReimbursementStatus.ENVIADO).quantidade).toBe(1);
    expect(statusEntry(summary, ReimbursementStatus.APROVADO).quantidade).toBe(1);
    expect(categoryEntry(summary, categoryAId)).toMatchObject({
      quantidade: 2,
      valorTotal: 300
    });
    expect(categoryEntry(summary, categoryBId)).toMatchObject({
      quantidade: 1,
      valorTotal: 300
    });
  });
});
