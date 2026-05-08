import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";

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

const refreshTokenCookieName = "refreshToken";

type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

function signAccessToken(user: Pick<PublicUser, "id" | "role">) {
  return jwt.sign(
    {
      role: user.role
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]
    }
  );
}

function parseDurationToMilliseconds(value: string) {
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)?$/);

  if (!match) {
    throw new AppError("Invalid refresh token expiration configuration", 500);
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "ms";
  const millisecondsByUnit: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * millisecondsByUnit[unit];
}

function getRefreshTokenExpirationDate() {
  return new Date(Date.now() + parseDurationToMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN));
}

function generateOpaqueRefreshToken() {
  return randomBytes(48).toString("base64url");
}

function hashRefreshToken(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

async function createRefreshToken(userId: string) {
  const refreshToken = generateOpaqueRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: getRefreshTokenExpirationDate()
    }
  });

  return refreshToken;
}

function setRefreshTokenCookie(response: Response, refreshToken: string) {
  response.cookie(refreshTokenCookieName, refreshToken, {
    httpOnly: true,
    maxAge: parseDurationToMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN),
    path: "/auth",
    sameSite: "lax",
    secure: env.COOKIE_SECURE
  });
}

function clearRefreshTokenCookie(response: Response) {
  response.clearCookie(refreshTokenCookieName, {
    httpOnly: true,
    path: "/auth",
    sameSite: "lax",
    secure: env.COOKIE_SECURE
  });
}

function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader.split(";").flatMap((cookie) => {
      const [rawName, ...rawValue] = cookie.trim().split("=");

      if (!rawName || rawValue.length === 0) {
        return [];
      }

      return [[rawName, decodeURIComponent(rawValue.join("="))]];
    })
  );
}

function getRefreshTokenFromRequest(request: Request) {
  return parseCookieHeader(request.headers.cookie).get(refreshTokenCookieName);
}

async function issueAuthSession(user: PublicUser) {
  const token = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return {
    refreshToken,
    token,
    user
  };
}

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

  const { passwordHash: _passwordHash, ...publicUser } = user;
  const session = await issueAuthSession(publicUser);

  setRefreshTokenCookie(response, session.refreshToken);

  return response.status(200).json({
    token: session.token,
    user: session.user
  });
});

export const refresh = asyncHandler(async (request, response) => {
  const refreshToken = getRefreshTokenFromRequest(request);

  if (!refreshToken) {
    throw new AppError("Refresh token is required", 401);
  }

  const storedRefreshToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash: hashRefreshToken(refreshToken)
    },
    include: {
      user: {
        select: publicUserSelect
      }
    }
  });

  if (
    !storedRefreshToken ||
    storedRefreshToken.revokedAt ||
    storedRefreshToken.expiresAt.getTime() <= Date.now()
  ) {
    clearRefreshTokenCookie(response);
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const session = await prisma.$transaction(async (transaction) => {
    await transaction.refreshToken.update({
      where: {
        id: storedRefreshToken.id
      },
      data: {
        revokedAt: new Date()
      }
    });

    const nextRefreshToken = generateOpaqueRefreshToken();

    await transaction.refreshToken.create({
      data: {
        userId: storedRefreshToken.userId,
        tokenHash: hashRefreshToken(nextRefreshToken),
        expiresAt: getRefreshTokenExpirationDate()
      }
    });

    return {
      refreshToken: nextRefreshToken,
      token: signAccessToken(storedRefreshToken.user),
      user: storedRefreshToken.user
    };
  });

  setRefreshTokenCookie(response, session.refreshToken);

  return response.status(200).json({
    token: session.token,
    user: session.user
  });
});

export const logout = asyncHandler(async (request, response) => {
  const refreshToken = getRefreshTokenFromRequest(request);

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  clearRefreshTokenCookie(response);

  return response.status(200).json({
    message: "Logout successful"
  });
});
