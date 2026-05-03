import { Role } from "@prisma/client";
import express from "express";
import request from "supertest";
import { z } from "zod";

import { AppError } from "../errors/app-error";
import { authorizeRoles } from "../middlewares/authorization";
import { errorHandler } from "../middlewares/error-handler";
import { notFoundHandler } from "../middlewares/not-found-handler";
import { asyncHandler } from "../utils/async-handler";

const testApp = express();

testApp.use(express.json());

testApp.get("/bad-request", () => {
  throw new AppError("Invalid request", 400);
});

testApp.get("/unauthorized", authorizeRoles(Role.ADMIN), (_request, response) => {
  return response.status(200).json({ ok: true });
});

testApp.get(
  "/forbidden",
  (request, _response, next) => {
    request.user = {
      id: "user-id",
      name: "User",
      email: "user@example.com",
      role: Role.COLABORADOR
    };
    next();
  },
  authorizeRoles(Role.ADMIN),
  (_request, response) => {
    return response.status(200).json({ ok: true });
  }
);

testApp.get("/zod-error", () => {
  z.object({ name: z.string() }).parse({});
});

testApp.get(
  "/server-error",
  asyncHandler(async () => {
    throw new Error("Unexpected failure");
  })
);

testApp.use(notFoundHandler);
testApp.use(errorHandler);

describe("error handling infrastructure", () => {
  it("returns a standardized 400 response", async () => {
    const response = await request(testApp).get("/bad-request");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Invalid request",
      statusCode: 400,
      error: "Bad Request"
    });
  });

  it("returns a standardized 400 response for Zod errors", async () => {
    const response = await request(testApp).get("/zod-error");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation error",
      statusCode: 400,
      error: "Bad Request"
    });
  });

  it("returns a standardized 401 response when user is missing", async () => {
    const response = await request(testApp).get("/unauthorized");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication is required",
      statusCode: 401,
      error: "Unauthorized"
    });
  });

  it("returns a standardized 403 response when role is not allowed", async () => {
    const response = await request(testApp).get("/forbidden");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "User does not have permission to access this resource",
      statusCode: 403,
      error: "Forbidden"
    });
  });

  it("returns a standardized 404 response", async () => {
    const response = await request(testApp).get("/missing-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Route GET /missing-route not found",
      statusCode: 404,
      error: "Not Found"
    });
  });

  it("returns a standardized 500 response", async () => {
    const response = await request(testApp).get("/server-error");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
      statusCode: 500,
      error: "Internal Server Error"
    });
  });
});
