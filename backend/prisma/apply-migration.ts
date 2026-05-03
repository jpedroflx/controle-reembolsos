import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const migrationName = "20260502205400_init";
const migrationPath = join(process.cwd(), "prisma", "migrations", migrationName, "migration.sql");

function splitStatements(sql: string) {
  return sql
    .replace(/\r\n/g, "\n")
    .split(/;\s*\n/)
    .map((statement) =>
      statement
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

async function registerMigration(checksum: string) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  const existingRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "_prisma_migrations" WHERE "migration_name" = '${migrationName}' LIMIT 1`
  );

  if (existingRows.length > 0) {
    await prisma.$executeRawUnsafe(`
      UPDATE "_prisma_migrations"
      SET
        "checksum" = '${checksum}',
        "finished_at" = COALESCE("finished_at", CURRENT_TIMESTAMP),
        "rolled_back_at" = NULL,
        "applied_steps_count" = 1
      WHERE "migration_name" = '${migrationName}'
    `);
    return;
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "_prisma_migrations" (
      "id",
      "checksum",
      "finished_at",
      "migration_name",
      "logs",
      "rolled_back_at",
      "started_at",
      "applied_steps_count"
    ) VALUES (
      '${randomUUID()}',
      '${checksum}',
      CURRENT_TIMESTAMP,
      '${migrationName}',
      NULL,
      NULL,
      CURRENT_TIMESTAMP,
      1
    )
  `);
}

async function main() {
  const sql = await readFile(migrationPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");

  for (const statement of splitStatements(sql)) {
    await prisma.$executeRawUnsafe(statement);
  }

  await registerMigration(checksum);
  console.log(`Migration ${migrationName} applied.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
