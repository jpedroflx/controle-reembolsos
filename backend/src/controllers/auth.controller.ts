import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";
import { loginSchema } from "../schemas/auth.schemas";
import { asyncHandler } from "../utils/async-handler";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
} as const;

export const login = asyncHandler(async (request, response) => {
  const { email, password } = loginSchema.parse({
    body: request.body
  }).body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...publicUserSelect,
      passwordHash: true
    }
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = jwt.sign(
    {
      role: user.role
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: "1d"
    }
  );

  const { passwordHash: _passwordHash, ...publicUser } = user;

  return response.status(200).json({
    token,
    user: publicUser
  });
});
