import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error";

export function authorizeRoles(...allowedRoles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      throw new AppError("Authentication is required", 401);
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError("User does not have permission to access this resource", 403);
    }

    next();
  };
}
