import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      name: string;
      email: string;
      role: Role;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
