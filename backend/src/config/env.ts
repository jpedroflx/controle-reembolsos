import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().default("file:./dev.db"),
  JWT_SECRET: z.string().min(1).default("development-secret"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default("7d"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  CORS_ORIGIN: z.string().default("http://localhost:5173")
});

export const env = envSchema.parse(process.env);
