import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";

import { app } from "../app";
import { prisma } from "../lib/prisma";

const testPassword = "Senha@123";
const collaboratorEmail = "history-attachments.colaborador.integration@teste.com";
const otherCollaboratorEmail = "history-attachments.outro-colaborador.integration@teste.com";

let collaboratorToken: string;
let otherCollaboratorToken: string;
let collaboratorId: string;
let activeCategoryId: string;

async function upsertUser(email: string) {
  const passwordHash = await bcrypt.hash(testPassword, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name: "Usuario COLABORADOR",
      passwordHash,
      role: Role.COLABORADOR
    },
    create: {
      name: "Usuario COLABORADOR",
      email,
      passwordHash,
      role: Role.COLABORADOR
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

async function createDraftRequest() {
  const response = await request(app)
    .post("/reimbursements")
    .set(auth(collaboratorToken))
    .send({
      categoriaId: activeCategoryId,
      descricao: "Solicitacao para anexos",
      valor: 100,
      dataDespesa: "2026-05-01"
    });

  expect(response.status).toBe(201);

  return response.body as { id: string };
}

function auth(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

describe("reimbursement history and simulated attachments", () => {
  beforeAll(async () => {
    const [collaborator, _otherCollaborator, activeCategory] = await Promise.all([
      upsertUser(collaboratorEmail),
      upsertUser(otherCollaboratorEmail),
      prisma.category.upsert({
        where: { name: "Categoria ativa anexos" },
        update: { active: true },
        create: { name: "Categoria ativa anexos", active: true },
        select: { id: true }
      })
    ]);

    collaboratorId = collaborator.id;
    activeCategoryId = activeCategory.id;

    await prisma.reimbursementRequest.deleteMany({
      where: {
        requesterId: collaboratorId
      }
    });

    collaboratorToken = await login(collaboratorEmail);
    otherCollaboratorToken = await login(otherCollaboratorEmail);
  });

  afterAll(async () => {
    await prisma.reimbursementRequest.deleteMany({
      where: {
        requesterId: collaboratorId
      }
    });
    await prisma.$disconnect();
  });

  it("lists reimbursement history with action, user, timestamp and note", async () => {
    const reimbursement = await createDraftRequest();

    const response = await request(app)
      .get(`/reimbursements/${reimbursement.id}/history`)
      .set(auth(collaboratorToken));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          acao: "CREATED",
          observacao: expect.any(String),
          criadoEm: expect.any(String),
          usuario: expect.objectContaining({
            id: collaboratorId,
            email: collaboratorEmail
          })
        })
      ])
    );
  });

  it("creates and lists simulated attachments while request is draft", async () => {
    const reimbursement = await createDraftRequest();

    const createResponse = await request(app)
      .post(`/reimbursements/${reimbursement.id}/attachments`)
      .set(auth(collaboratorToken))
      .send({
        nomeArquivo: "comprovante.pdf",
        urlArquivo: "/uploads/simulados/comprovante.pdf",
        tipoArquivo: "PDF"
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      nomeArquivo: "comprovante.pdf",
      urlArquivo: "/uploads/simulados/comprovante.pdf",
      tipoArquivo: "PDF"
    });

    const listResponse = await request(app)
      .get(`/reimbursements/${reimbursement.id}/attachments`)
      .set(auth(collaboratorToken));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.id,
          tipoArquivo: "PDF"
        })
      ])
    );
  });

  it("returns 400 for unsupported attachment types", async () => {
    const reimbursement = await createDraftRequest();

    const response = await request(app)
      .post(`/reimbursements/${reimbursement.id}/attachments`)
      .set(auth(collaboratorToken))
      .send({
        nomeArquivo: "arquivo.exe",
        urlArquivo: "/uploads/simulados/arquivo.exe",
        tipoArquivo: "EXE"
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request"
    });
  });

  it("returns 403 when another collaborator tries to attach", async () => {
    const reimbursement = await createDraftRequest();

    const response = await request(app)
      .post(`/reimbursements/${reimbursement.id}/attachments`)
      .set(auth(otherCollaboratorToken))
      .send({
        nomeArquivo: "outro.pdf",
        urlArquivo: "/uploads/simulados/outro.pdf",
        tipoArquivo: "PDF"
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      statusCode: 403,
      error: "Forbidden"
    });
  });

  it("returns 400 when attaching outside draft status", async () => {
    const reimbursement = await createDraftRequest();

    await request(app).post(`/reimbursements/${reimbursement.id}/submit`).set(auth(collaboratorToken)).expect(200);

    const response = await request(app)
      .post(`/reimbursements/${reimbursement.id}/attachments`)
      .set(auth(collaboratorToken))
      .send({
        nomeArquivo: "tarde.png",
        urlArquivo: "/uploads/simulados/tarde.png",
        tipoArquivo: "PNG"
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: "Attachments can only be added to draft reimbursement requests",
      statusCode: 400
    });
  });

  it("returns 404 for history or attachments of a missing request", async () => {
    const historyResponse = await request(app)
      .get("/reimbursements/id-inexistente/history")
      .set(auth(collaboratorToken));

    expect(historyResponse.status).toBe(404);

    const attachmentResponse = await request(app)
      .post("/reimbursements/id-inexistente/attachments")
      .set(auth(collaboratorToken))
      .send({
        nomeArquivo: "missing.png",
        urlArquivo: "/uploads/simulados/missing.png",
        tipoArquivo: "PNG"
      });

    expect(attachmentResponse.status).toBe(404);
  });
});
