import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/async-handler";

function getBearerToken(authorizationHeader?: string) {
  if (!authorizationHeader) {
    throw new AppError("Authentication token is required", 401);
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Invalid authentication token format", 401);
  }

  return token;
}

function getUserIdFromPayload(payload: string | JwtPayload) {
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new AppError("Invalid authentication token", 401);
  }

  return payload.sub;
}

export const authenticate = asyncHandler(async (request, _response, next) => {
  const token = getBearerToken(request.headers.authorization);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const userId = getUserIdFromPayload(payload);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      throw new AppError("Authenticated user was not found", 401);
    }

    request.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Invalid or expired authentication token", 401);
  }
});
