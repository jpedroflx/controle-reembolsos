import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";

import { app } from "../app";
import { prisma } from "../lib/prisma";

const testPassword = "Senha@123";
const adminEmail = "categories.admin.integration@teste.com";
const collaboratorEmail = "categories.colaborador.integration@teste.com";

let adminToken: string;
let collaboratorToken: string;

async function upsertUser(email: string, role: Role) {
  const passwordHash = await bcrypt.hash(testPassword, 10);

  await prisma.user.upsert({
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

describe("category routes", () => {
  beforeAll(async () => {
    await upsertUser(adminEmail, Role.ADMIN);
    await upsertUser(collaboratorEmail, Role.COLABORADOR);

    adminToken = await login(adminEmail);
    collaboratorToken = await login(collaboratorEmail);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists categories for authenticated users", async () => {
    const response = await request(app).get("/categories").set(auth(collaboratorToken));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("returns 401 when listing categories without token", async () => {
    const response = await request(app).get("/categories");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      statusCode: 401,
      error: "Unauthorized"
    });
  });

  it("allows only admin to create categories", async () => {
    const forbiddenResponse = await request(app)
      .post("/categories")
      .set(auth(collaboratorToken))
      .send({
        name: "Categoria nao autorizada",
        active: true
      });

    expect(forbiddenResponse.status).toBe(403);

    const categoryName = `Categoria teste ${Date.now()}`;
    const response = await request(app).post("/categories").set(auth(adminToken)).send({
      name: categoryName,
      active: true,
      attachmentRequiredAboveAmount: 250,
      maxAmount: 350
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: categoryName,
      active: true,
      attachmentRequiredAboveAmount: 250,
      maxAmount: 350
    });
  });

  it("returns 400 when creating a category without a valid name", async () => {
    const response = await request(app).post("/categories").set(auth(adminToken)).send({
      name: "",
      active: true
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request"
    });
  });

  it("allows admin to update and inactivate categories", async () => {
    const createdCategory = await prisma.category.create({
      data: {
        name: `Categoria para inativar ${Date.now()}`,
        active: true,
        attachmentRequiredAboveAmount: 150,
        maxAmount: 200
      }
    });

    const response = await request(app)
      .put(`/categories/${createdCategory.id}`)
      .set(auth(adminToken))
      .send({
        active: false,
        attachmentRequiredAboveAmount: null,
        maxAmount: null
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: createdCategory.id,
      active: false,
      attachmentRequiredAboveAmount: null,
      maxAmount: null
    });
  });

  it("returns 404 when updating a missing category", async () => {
    const response = await request(app).put("/categories/id-inexistente").set(auth(adminToken)).send({
      name: "Categoria inexistente"
    });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      message: "Category not found",
      statusCode: 404,
      error: "Not Found"
    });
  });
});
