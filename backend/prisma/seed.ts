import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    name: "Carla Colaboradora",
    email: "colaborador@teste.com",
    role: Role.COLABORADOR
  },
  {
    name: "Gustavo Gestor",
    email: "gestor@teste.com",
    role: Role.GESTOR
  },
  {
    name: "Fernanda Financeiro",
    email: "financeiro@teste.com",
    role: Role.FINANCEIRO
  },
  {
    name: "Ana Admin",
    email: "admin@teste.com",
    role: Role.ADMIN
  }
];

const categories = [
  { name: "Transporte", active: true, maxAmount: 500, attachmentRequiredAboveAmount: 300 },
  { name: "Alimentacao", active: true, maxAmount: 120, attachmentRequiredAboveAmount: null },
  { name: "Hospedagem", active: true, maxAmount: 1500, attachmentRequiredAboveAmount: 800 },
  { name: "Material de escritorio", active: true, maxAmount: null, attachmentRequiredAboveAmount: null },
  { name: "Categoria inativa exemplo", active: false, maxAmount: 100, attachmentRequiredAboveAmount: 50 }
];

async function main() {
  const passwordHash = await bcrypt.hash("Senha@123", 10);

  await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          passwordHash,
          role: user.role
        },
        create: {
          ...user,
          passwordHash
        }
      })
    )
  );

  await Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { name: category.name },
        update: {
          active: category.active,
          attachmentRequiredAboveAmount: category.attachmentRequiredAboveAmount,
          maxAmount: category.maxAmount
        },
        create: category
      })
    )
  );
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
