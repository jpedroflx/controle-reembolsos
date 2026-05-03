import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError, getHttpErrorName } from "../errors/app-error";

type HttpError = Error & {
  error?: string;
  status?: number;
  statusCode?: number;
};

const handledStatusCodes = [400, 401, 403, 404, 500];

function normalizeStatusCode(statusCode?: number) {
  if (statusCode && handledStatusCodes.includes(statusCode)) {
    return statusCode;
  }

  return 500;
}

export function errorHandler(
  error: HttpError,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Validation error",
      statusCode: 400,
      error: "Bad Request"
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      message: error.message,
      statusCode: error.statusCode,
      error: error.error
    });
  }

  const statusCode = normalizeStatusCode(error.statusCode ?? error.status);

  return response.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : error.message,
    statusCode,
    error: getHttpErrorName(statusCode)
  });
}
