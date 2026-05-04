import type { Prisma } from "@prisma/client";

import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";
import { createCategorySchema, updateCategorySchema } from "../schemas/categories.schemas";
import { asyncHandler } from "../utils/async-handler";

const categorySelect = {
  id: true,
  name: true,
  active: true,
  maxAmount: true,
  attachmentRequiredAboveAmount: true,
  createdAt: true,
  updatedAt: true
} as const;

type CategoryRecord = Prisma.CategoryGetPayload<{
  select: typeof categorySelect;
}>;

function serializeCategory(category: CategoryRecord) {
  return {
    ...category,
    attachmentRequiredAboveAmount:
      category.attachmentRequiredAboveAmount === null ? null : Number(category.attachmentRequiredAboveAmount),
    maxAmount: category.maxAmount === null ? null : Number(category.maxAmount)
  };
}

export const listCategories = asyncHandler(async (_request, response) => {
  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc"
    },
    select: categorySelect
  });

  return response.status(200).json(categories.map(serializeCategory));
});

export const createCategory = asyncHandler(async (request, response) => {
  const { name, active, attachmentRequiredAboveAmount, maxAmount } = createCategorySchema.parse({
    body: request.body
  }).body;

  const categoryAlreadyExists = await prisma.category.findUnique({
    where: { name },
    select: { id: true }
  });

  if (categoryAlreadyExists) {
    throw new AppError("Category name is already in use", 400);
  }

  const category = await prisma.category.create({
    data: {
      name,
      active,
      attachmentRequiredAboveAmount,
      maxAmount
    },
    select: categorySelect
  });

  return response.status(201).json(serializeCategory(category));
});

export const updateCategory = asyncHandler(async (request, response) => {
  const {
    params: { id },
    body
  } = updateCategorySchema.parse({
    params: request.params,
    body: request.body
  });

  const categoryExists = await prisma.category.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!categoryExists) {
    throw new AppError("Category not found", 404);
  }

  if (body.name) {
    const categoryWithSameName = await prisma.category.findFirst({
      where: {
        name: body.name,
        NOT: {
          id
        }
      },
      select: { id: true }
    });

    if (categoryWithSameName) {
      throw new AppError("Category name is already in use", 400);
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: body,
    select: categorySelect
  });

  return response.status(200).json(serializeCategory(category));
});
