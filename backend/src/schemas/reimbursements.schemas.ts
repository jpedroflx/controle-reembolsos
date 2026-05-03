import { z } from "zod";

const reimbursementBodySchema = z.object({
  categoriaId: z.string().min(1),
  descricao: z.string().trim().min(1),
  valor: z.coerce.number().positive(),
  dataDespesa: z.coerce.date()
});

export const createReimbursementSchema = z.object({
  body: reimbursementBodySchema
});

export const reimbursementParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
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
    justificativaRejeicao: z.string().trim().min(1)
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
export type UpdateReimbursementInput = z.infer<typeof updateReimbursementSchema>["body"];
export type RejectReimbursementInput = z.infer<typeof rejectReimbursementSchema>["body"];
export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>["body"];
