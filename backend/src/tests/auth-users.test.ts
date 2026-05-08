import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";
import type { Response } from "supertest";

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

function getRefreshCookie(response: Response) {
  const setCookie = response.headers["set-cookie"];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie].filter(Boolean);
  const refreshCookie = cookies.find((cookie) => cookie.startsWith("refreshToken="));

  expect(refreshCookie).toEqual(expect.any(String));

  return refreshCookie!.split(";")[0];
}

describe("auth and user routes", () => {
  let adminId: string;
  let collaboratorId: string;

  beforeAll(async () => {
    const [admin, collaborator] = await Promise.all([
      upsertTestUser(adminEmail, Role.ADMIN),
      upsertTestUser(collaboratorEmail, Role.COLABORADOR)
    ]);

    adminId = admin.id;
    collaboratorId = collaborator.id;

    await prisma.refreshToken.deleteMany({
      where: {
        userId: {
          in: [adminId, collaboratorId]
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        userId: {
          in: [adminId, collaboratorId].filter(Boolean)
        }
      }
    });
    await prisma.$disconnect();
  });

  it("logs in successfully with valid credentials", async () => {
    const response = await request(app).post("/auth/login").send({
      email: adminEmail,
      password: testPassword
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.body.user).toMatchObject({
      email: adminEmail,
      role: Role.ADMIN
    });
    expect(response.body.user).not.toHaveProperty("password");
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(getRefreshCookie(response)).toMatch(/^refreshToken=.+/);

    const storedRefreshToken = await prisma.refreshToken.findFirst({
      where: {
        userId: adminId,
        revokedAt: null
      }
    });

    expect(storedRefreshToken).toMatchObject({
      userId: adminId
    });
    expect(storedRefreshToken?.tokenHash).toEqual(expect.any(String));
  });

  it("refreshes access token and rotates the refresh token", async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: adminId }
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: adminEmail,
      password: testPassword
    });
    const refreshCookie = getRefreshCookie(loginResponse);
    const originalRefreshToken = await prisma.refreshToken.findFirstOrThrow({
      where: {
        userId: adminId,
        revokedAt: null
      }
    });

    const response = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie);

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.body.user).toMatchObject({
      email: adminEmail,
      role: Role.ADMIN
    });
    expect(getRefreshCookie(response)).toMatch(/^refreshToken=.+/);

    const revokedOriginalToken = await prisma.refreshToken.findUniqueOrThrow({
      where: {
        id: originalRefreshToken.id
      }
    });
    const activeTokens = await prisma.refreshToken.findMany({
      where: {
        userId: adminId,
        revokedAt: null
      }
    });

    expect(revokedOriginalToken.revokedAt).toBeInstanceOf(Date);
    expect(activeTokens).toHaveLength(1);
    expect(activeTokens[0].id).not.toBe(originalRefreshToken.id);
  });

  it("returns 401 when refreshing without a cookie", async () => {
    const response = await request(app).post("/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Refresh token is required",
      statusCode: 401,
      error: "Unauthorized"
    });
  });

  it("returns 401 when refreshing with an expired refresh token", async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: adminId }
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: adminEmail,
      password: testPassword
    });
    const refreshCookie = getRefreshCookie(loginResponse);
    const storedRefreshToken = await prisma.refreshToken.findFirstOrThrow({
      where: {
        userId: adminId,
        revokedAt: null
      }
    });

    await prisma.refreshToken.update({
      where: { id: storedRefreshToken.id },
      data: {
        expiresAt: new Date(Date.now() - 1000)
      }
    });

    const response = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid or expired refresh token",
      statusCode: 401,
      error: "Unauthorized"
    });
  });

  it("returns 401 when refreshing with a revoked refresh token", async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: adminId }
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: adminEmail,
      password: testPassword
    });
    const refreshCookie = getRefreshCookie(loginResponse);
    const storedRefreshToken = await prisma.refreshToken.findFirstOrThrow({
      where: {
        userId: adminId,
        revokedAt: null
      }
    });

    await prisma.refreshToken.update({
      where: { id: storedRefreshToken.id },
      data: {
        revokedAt: new Date()
      }
    });

    const response = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid or expired refresh token",
      statusCode: 401,
      error: "Unauthorized"
    });
  });

  it("logs out and revokes the current refresh token", async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: adminId }
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: adminEmail,
      password: testPassword
    });
    const refreshCookie = getRefreshCookie(loginResponse);
    const storedRefreshToken = await prisma.refreshToken.findFirstOrThrow({
      where: {
        userId: adminId,
        revokedAt: null
      }
    });

    const response = await request(app)
      .post("/auth/logout")
      .set("Cookie", refreshCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Logout successful"
    });

    const revokedRefreshToken = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: storedRefreshToken.id }
    });

    expect(revokedRefreshToken.revokedAt).toBeInstanceOf(Date);
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

  it("returns 401 when accessing a protected route with an invalid token", async () => {
    const response = await request(app)
      .get("/users")
      .set("Authorization", "Bearer token-invalido");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid or expired authentication token",
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
      password: testPassword
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation error",
      statusCode: 400,
      error: "Bad Request"
    });
  });

  it("creates public users only as collaborators even when a privileged role is sent", async () => {
    const email = `auth.public-admin-attempt.${Date.now()}@teste.com`;

    const response = await request(app).post("/users").send({
      name: "Usuario Publico",
      email,
      password: testPassword,
      role: Role.ADMIN
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      email,
      role: Role.COLABORADOR
    });
    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("passwordHash");

    const createdUser = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { role: true }
    });

    expect(createdUser.role).toBe(Role.COLABORADOR);
  });
});
