import bcrypt from "bcrypt";

import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";
import { createUserSchema } from "../schemas/users.schemas";
import { asyncHandler } from "../utils/async-handler";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
} as const;

export const createUser = asyncHandler(async (request, response) => {
  const { name, email, password, role } = createUserSchema.parse({
    body: request.body
  }).body;

  const userAlreadyExists = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (userAlreadyExists) {
    throw new AppError("Email is already in use", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role
    },
    select: publicUserSelect
  });

  return response.status(201).json(user);
});

export const listUsers = asyncHandler(async (_request, response) => {
  const users = await prisma.user.findMany({
    orderBy: {
      name: "asc"
    },
    select: publicUserSelect
  });

  return response.status(200).json(users);
});
