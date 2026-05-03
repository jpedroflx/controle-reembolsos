import { Role } from "@prisma/client";
import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.nativeEnum(Role)
  })
});

export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
