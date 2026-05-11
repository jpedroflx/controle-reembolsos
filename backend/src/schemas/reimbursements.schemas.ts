import { ReimbursementStatus } from "@prisma/client";
import { z } from "zod";

const reimbursementBodySchema = z.object({
  categoriaId: z.string().min(1),
  descricao: z.string().trim().min(1),
  valor: z.coerce.number().positive(),
  dataDespesa: z.coerce.date()
});

const reimbursementFiltersQuerySchema = z.object({
  status: z.nativeEnum(ReimbursementStatus).optional(),
  categoriaId: z.string().trim().min(1).optional(),
  solicitante: z.string().trim().min(1).optional()
});

export const createReimbursementSchema = z.object({
  body: reimbursementBodySchema
});

export const reimbursementParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const listReimbursementsSchema = z.object({
  query: reimbursementFiltersQuerySchema.extend({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    sortBy: z.enum(["criadoEm", "dataDespesa", "valor"]).default("criadoEm"),
    sortOrder: z.enum(["asc", "desc"]).default("desc")
  })
});

export const reimbursementSummarySchema = z.object({
  query: reimbursementFiltersQuerySchema
});

export const updateReimbursementSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: reimbursementBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  })
});

export const rejectReimbursementSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    justificativaRejeicao: z.string().trim().min(50, "A justificativa para uma rejeição deve conter pelo menos 50 caracteres")
  })
});

export const createAttachmentSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    nomeArquivo: z.string().trim().min(1),
    urlArquivo: z.string().trim().min(1),
    tipoArquivo: z
      .string()
      .trim()
      .toUpperCase()
      .refine((fileType) => ["PDF", "JPG", "JPEG", "PNG"].includes(fileType), {
        message: "Invalid file type"
      })
  })
});

export type CreateReimbursementInput = z.infer<typeof createReimbursementSchema>["body"];
export type ListReimbursementsInput = z.infer<typeof listReimbursementsSchema>["query"];
export type ReimbursementSummaryInput = z.infer<typeof reimbursementSummarySchema>["query"];
export type UpdateReimbursementInput = z.infer<typeof updateReimbursementSchema>["body"];
export type RejectReimbursementInput = z.infer<typeof rejectReimbursementSchema>["body"];
export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>["body"];
