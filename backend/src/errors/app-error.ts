const errorNames: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error"
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly error: string;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.error = errorNames[statusCode] ?? "Error";
  }
}

export function getHttpErrorName(statusCode: number) {
  return errorNames[statusCode] ?? "Error";
}
