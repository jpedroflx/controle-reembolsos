import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error";

export function notFoundHandler(request: Request, _response: Response, next: NextFunction) {
  next(new AppError(`Route ${request.method} ${request.originalUrl} not found`, 404));
}
