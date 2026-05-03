import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";

import { app } from "../app";
import { prisma } from "../lib/prisma";

const testPassword = "Senha@123";
const adminEmail = "auth.admin.integration@teste.com";
const collaboratorEmail = "auth.colaborador.integration@teste.com";

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
    }
  });
}

describe("auth and user routes", () => {
  beforeAll(async () => {
    await upsertTestUser(adminEmail, Role.ADMIN);
    await upsertTestUser(collaboratorEmail, Role.COLABORADOR);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("logs in successfully with valid credentials", async () => {
    const response = await request(app).post("/auth/login").send({
      email: adminEmail,
      password: testPassword
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email: adminEmail,
      role: Role.ADMIN
    });
    expect(response.body.user).not.toHaveProperty("password");
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects login with an invalid password", async () => {
    const response = await request(app).post("/auth/login").send({
      email: adminEmail,
      password: "senha-incorreta"
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid email or password",
      statusCode: 401,
      error: "Unauthorized"
    });
  });

  it("returns 401 when accessing a protected route without token", async () => {
    const response = await request(app).get("/users");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication token is required",
      statusCode: 401,
      error: "Unauthorized"
    });
  });

  it("returns 403 when a non-admin user accesses the admin users route", async () => {
    const loginResponse = await request(app).post("/auth/login").send({
      email: collaboratorEmail,
      password: testPassword
    });

    const response = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${loginResponse.body.token}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "User does not have permission to access this resource",
      statusCode: 403,
      error: "Forbidden"
    });
  });

  it("returns 400 when creating a user with an invalid email", async () => {
    const response = await request(app).post("/users").send({
      name: "Usuario Email Invalido",
      email: "email-invalido",
      password: testPassword,
      role: Role.COLABORADOR
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation error",
      statusCode: 400,
      error: "Bad Request"
    });
  });
});
