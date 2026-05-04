import { z } from "zod";

const maxAmountSchema = z.coerce.number().positive().nullable().optional();

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    active: z.boolean().optional().default(true),
    maxAmount: maxAmountSchema
  })
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    active: z.boolean().optional(),
    maxAmount: maxAmountSchema
  })
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>["body"];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>["body"];
