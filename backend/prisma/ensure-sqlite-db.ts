import { closeSync, copyFileSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";

import dotenv from "dotenv";

const envPath = resolve(process.cwd(), ".env");
const envExamplePath = resolve(process.cwd(), ".env.example");

if (!existsSync(envPath) && existsSync(envExamplePath)) {
  copyFileSync(envExamplePath, envPath);
}

dotenv.config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.startsWith("file:")) {
  process.exit(0);
}

const sqlitePath = databaseUrl.slice("file:".length).split("?")[0];

if (!sqlitePath) {
  process.exit(0);
}

const isWindowsAbsolutePath = /^[a-zA-Z]:[\\/]/.test(sqlitePath);
const isAbsolutePath = sqlitePath.startsWith("/") || sqlitePath.startsWith("\\\\") || isWindowsAbsolutePath;
const databasePath = isAbsolutePath ? sqlitePath : resolve(process.cwd(), "prisma", sqlitePath);

mkdirSync(dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, "a"));
