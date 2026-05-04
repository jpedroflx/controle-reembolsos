import {
  HistoryAction,
  ReimbursementStatus,
  Role,
  type Prisma
} from "@prisma/client";
import type { Request } from "express";

import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";
import {
  createAttachmentSchema,
  createReimbursementSchema,
  listReimbursementsSchema,
  rejectReimbursementSchema,
  reimbursementParamsSchema,
  reimbursementSummarySchema,
  type ReimbursementSummaryInput,
  updateReimbursementSchema
} from "../schemas/reimbursements.schemas";
import { asyncHandler } from "../utils/async-handler";

const reimbursementInclude = {
  requester: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  },
  category: {
    select: {
      id: true,
      name: true,
      active: true,
      maxAmount: true,
      attachmentRequiredAboveAmount: true
    }
  },
  attachments: {
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      fileType: true,
      createdAt: true
    }
  },
  history: {
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      action: true,
      note: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  }
} satisfies Prisma.ReimbursementRequestInclude;

type ReimbursementWithRelations = Prisma.ReimbursementRequestGetPayload<{
  include: typeof reimbursementInclude;
}>;

function getAuthenticatedUser(request: Request) {
  if (!request.user) {
    throw new AppError("Authentication is required", 401);
  }

  return request.user;
}

function getListWhereByRole(user: Express.AuthenticatedUser): Prisma.ReimbursementRequestWhereInput {
  if (user.role === Role.COLABORADOR) {
    return { requesterId: user.id };
  }

  if (user.role === Role.GESTOR) {
    return { status: ReimbursementStatus.ENVIADO };
  }

  if (user.role === Role.FINANCEIRO) {
    return { status: ReimbursementStatus.APROVADO };
  }

  return {};
}

function getListWhereByRoleAndFilters(
  user: Express.AuthenticatedUser,
  { categoriaId, solicitante, status }: ReimbursementSummaryInput
): Prisma.ReimbursementRequestWhereInput {
  const whereFilters: Prisma.ReimbursementRequestWhereInput[] = [getListWhereByRole(user)];

  if (status) {
    whereFilters.push({ status });
  }

  if (categoriaId) {
    whereFilters.push({ categoryId: categoriaId });
  }

  if (solicitante) {
    whereFilters.push({
      requester: {
        OR: [
          {
            name: {
              contains: solicitante
            }
          },
          {
            email: {
              contains: solicitante
            }
          }
        ]
      }
    });
  }

  return {
    AND: whereFilters
  };
}

function getListOrderBy(
  sortBy: "criadoEm" | "dataDespesa" | "valor",
  sortOrder: "asc" | "desc"
): Prisma.ReimbursementRequestOrderByWithRelationInput {
  const fieldBySort = {
    criadoEm: "createdAt",
    dataDespesa: "expenseDate",
    valor: "amount"
  } satisfies Record<typeof sortBy, keyof Prisma.ReimbursementRequestOrderByWithRelationInput>;

  return {
    [fieldBySort[sortBy]]: sortOrder
  };
}

type ReimbursementAccessData = {
  requesterId: string;
  status: ReimbursementStatus;
};

function canAccessReimbursement(
  user: Express.AuthenticatedUser,
  reimbursement: ReimbursementAccessData
) {
  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.COLABORADOR) {
    return reimbursement.requesterId === user.id;
  }

  if (user.role === Role.GESTOR) {
    return reimbursement.status === ReimbursementStatus.ENVIADO;
  }

  if (user.role === Role.FINANCEIRO) {
    return reimbursement.status === ReimbursementStatus.APROVADO;
  }

  return false;
}

function serializeReimbursement(reimbursement: ReimbursementWithRelations) {
  return {
    id: reimbursement.id,
    solicitanteId: reimbursement.requesterId,
    categoriaId: reimbursement.categoryId,
    descricao: reimbursement.description,
    valor: Number(reimbursement.amount),
    dataDespesa: reimbursement.expenseDate,
    status: reimbursement.status,
    justificativaRejeicao: reimbursement.rejectionReason,
    criadoEm: reimbursement.createdAt,
    atualizadoEm: reimbursement.updatedAt,
    solicitante: {
      id: reimbursement.requester.id,
      nome: reimbursement.requester.name,
      email: reimbursement.requester.email,
      perfil: reimbursement.requester.role
    },
    categoria: {
      id: reimbursement.category.id,
      nome: reimbursement.category.name,
      ativo: reimbursement.category.active,
      valorMaximo: reimbursement.category.maxAmount === null ? null : Number(reimbursement.category.maxAmount),
      anexoObrigatorioAcimaDe:
        reimbursement.category.attachmentRequiredAboveAmount === null
          ? null
          : Number(reimbursement.category.attachmentRequiredAboveAmount)
    },
    anexos: reimbursement.attachments.map((attachment) => ({
      id: attachment.id,
      nomeArquivo: attachment.fileName,
      urlArquivo: attachment.fileUrl,
      tipoArquivo: attachment.fileType,
      criadoEm: attachment.createdAt
    })),
    historico: reimbursement.history.map((entry) => ({
      id: entry.id,
      acao: entry.action,
      observacao: entry.note,
      criadoEm: entry.createdAt,
      usuario: {
        id: entry.user.id,
        nome: entry.user.name,
        email: entry.user.email,
        perfil: entry.user.role
      }
    }))
  };
}

function serializeAttachment(attachment: {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    nomeArquivo: attachment.fileName,
    urlArquivo: attachment.fileUrl,
    tipoArquivo: attachment.fileType,
    criadoEm: attachment.createdAt
  };
}

function serializeHistoryEntry(entry: {
  id: string;
  action: HistoryAction;
  note: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}) {
  return {
    id: entry.id,
    acao: entry.action,
    observacao: entry.note,
    criadoEm: entry.createdAt,
    usuario: {
      id: entry.user.id,
      nome: entry.user.name,
      email: entry.user.email,
      perfil: entry.user.role
    }
  };
}

function toNumber(value: unknown) {
  return value ? Number(value) : 0;
}

function getGroupCount(entry: { _count?: true | { id?: number } } | undefined) {
  if (!entry?._count || entry._count === true) {
    return 0;
  }

  return entry._count.id ?? 0;
}

function getGroupAmount(entry: { _sum?: { amount?: unknown } } | undefined) {
  return toNumber(entry?._sum?.amount);
}

async function ensureActiveCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      active: true,
      maxAmount: true
    }
  });

  if (!category || !category.active) {
    throw new AppError("Category not found or inactive", 400);
  }

  return category;
}

function ensureCategoryAmountLimit(maxAmount: unknown, amount: number) {
  if (maxAmount !== null && maxAmount !== undefined && amount > Number(maxAmount)) {
    throw new AppError("Reimbursement amount exceeds category limit", 400);
  }
}

async function ensureActiveCategoryAllowsAmount(categoryId: string, amount: number) {
  const category = await ensureActiveCategory(categoryId);

  ensureCategoryAmountLimit(category.maxAmount, amount);
}

async function ensureExistingCategoryAllowsAmount(categoryId: string, amount: number) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      maxAmount: true
    }
  });

  if (!category) {
    throw new AppError("Category not found or inactive", 400);
  }

  ensureCategoryAmountLimit(category.maxAmount, amount);
}

function getUtcDateOnlyTime(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function ensureExpenseDateIsNotInFuture(expenseDate: Date | undefined) {
  if (!expenseDate) {
    return;
  }

  if (getUtcDateOnlyTime(expenseDate) > getUtcDateOnlyTime(new Date())) {
    throw new AppError("Expense date cannot be in the future", 400);
  }
}

async function ensureRequiredAttachmentBeforeSubmit(request: Request, reimbursementId: string) {
  const user = getAuthenticatedUser(request);

  const reimbursement = await prisma.reimbursementRequest.findUnique({
    where: { id: reimbursementId },
    select: {
      id: true,
      requesterId: true,
      status: true,
      amount: true,
      category: {
        select: {
          attachmentRequiredAboveAmount: true
        }
      },
      _count: {
        select: {
          attachments: true
        }
      }
    }
  });

  if (!reimbursement) {
    throw new AppError("Reimbursement request not found", 404);
  }

  if (reimbursement.requesterId !== user.id) {
    throw new AppError("User does not have permission to access this resource", 403);
  }

  if (reimbursement.status !== ReimbursementStatus.RASCUNHO) {
    throw new AppError("Invalid reimbursement status transition", 400);
  }

  const requiredAboveAmount = reimbursement.category.attachmentRequiredAboveAmount;

  if (
    requiredAboveAmount !== null &&
    Number(reimbursement.amount) > Number(requiredAboveAmount) &&
    reimbursement._count.attachments === 0
  ) {
    throw new AppError("Attachment is required to submit reimbursements above category threshold", 400);
  }
}

type TransitionOptions = {
  action: HistoryAction;
  expectedStatus: ReimbursementStatus;
  nextStatus: ReimbursementStatus;
  note: string;
  rejectionReason?: string | null;
  requireOwner?: boolean;
};

async function transitionReimbursement(
  request: Request,
  reimbursementId: string,
  {
    action,
    expectedStatus,
    nextStatus,
    note,
    rejectionReason,
    requireOwner = false
  }: TransitionOptions
) {
  const user = getAuthenticatedUser(request);

  const reimbursement = await prisma.reimbursementRequest.findUnique({
    where: { id: reimbursementId },
    select: {
      id: true,
      requesterId: true,
      status: true
    }
  });

  if (!reimbursement) {
    throw new AppError("Reimbursement request not found", 404);
  }

  if (requireOwner && reimbursement.requesterId !== user.id) {
    throw new AppError("User does not have permission to access this resource", 403);
  }

  if (reimbursement.status !== expectedStatus) {
    throw new AppError("Invalid reimbursement status transition", 400);
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.reimbursementRequest.update({
      where: { id: reimbursementId },
      data: {
        status: nextStatus,
        rejectionReason
      }
    });

    await transaction.reimbursementHistory.create({
      data: {
        requestId: reimbursementId,
        userId: user.id,
        action,
        note
      }
    });

    return transaction.reimbursementRequest.findUniqueOrThrow({
      where: { id: reimbursementId },
      include: reimbursementInclude
    });
  });
}

export const listReimbursements = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const {
    query: { page, pageSize, status, categoriaId, solicitante, sortBy, sortOrder }
  } = listReimbursementsSchema.parse({
    query: request.query
  });

  const where = getListWhereByRoleAndFilters(user, {
    categoriaId,
    solicitante,
    status
  });

  const [total, reimbursements] = await prisma.$transaction([
    prisma.reimbursementRequest.count({
      where
    }),
    prisma.reimbursementRequest.findMany({
      where,
      orderBy: getListOrderBy(sortBy, sortOrder),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: reimbursementInclude
    })
  ]);

  return response.status(200).json({
    data: reimbursements.map(serializeReimbursement),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

export const getReimbursementsSummary = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const {
    query
  } = reimbursementSummarySchema.parse({
    query: request.query
  });

  const where = getListWhereByRoleAndFilters(user, query);

  const [totalSolicitacoes, totalAmount, byStatus, byCategory] = await prisma.$transaction([
    prisma.reimbursementRequest.count({
      where
    }),
    prisma.reimbursementRequest.aggregate({
      where,
      _sum: {
        amount: true
      }
    }),
    prisma.reimbursementRequest.groupBy({
      by: ["status"],
      where,
      orderBy: {
        status: "asc"
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    }),
    prisma.reimbursementRequest.groupBy({
      by: ["categoryId"],
      where,
      orderBy: {
        categoryId: "asc"
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    })
  ]);

  const categoryIds = byCategory.map((entry) => entry.categoryId);
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: {
          id: {
            in: categoryIds
          }
        },
        select: {
          id: true,
          name: true
        }
      })
    : [];
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const statusSummaryByStatus = new Map(byStatus.map((entry) => [entry.status, entry]));

  return response.status(200).json({
    totalSolicitacoes,
    valorTotal: toNumber(totalAmount._sum.amount),
    porStatus: Object.values(ReimbursementStatus).map((status) => {
      const summary = statusSummaryByStatus.get(status);

      return {
        status,
        quantidade: getGroupCount(summary),
        valorTotal: getGroupAmount(summary)
      };
    }),
    porCategoria: byCategory.map((entry) => ({
      categoriaId: entry.categoryId,
      categoriaNome: categoryNameById.get(entry.categoryId) ?? "Categoria nao encontrada",
      quantidade: getGroupCount(entry),
      valorTotal: getGroupAmount(entry)
    }))
  });
});

export const createReimbursement = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const { categoriaId, dataDespesa, descricao, valor } = createReimbursementSchema.parse({
    body: request.body
  }).body;

  ensureExpenseDateIsNotInFuture(dataDespesa);
  await ensureActiveCategoryAllowsAmount(categoriaId, valor);

  const reimbursement = await prisma.reimbursementRequest.create({
    data: {
      requesterId: user.id,
      categoryId: categoriaId,
      description: descricao,
      amount: valor,
      expenseDate: dataDespesa,
      status: ReimbursementStatus.RASCUNHO,
      history: {
        create: {
          userId: user.id,
          action: HistoryAction.CREATED,
          note: "Solicitação criada pelo colaborador"
        }
      }
    },
    include: reimbursementInclude
  });

  return response.status(201).json(serializeReimbursement(reimbursement));
});

export const getReimbursementById = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const {
    params: { id }
  } = reimbursementParamsSchema.parse({
    params: request.params
  });

  const reimbursement = await prisma.reimbursementRequest.findUnique({
    where: { id },
    include: reimbursementInclude
  });

  if (!reimbursement) {
    throw new AppError("Reimbursement request not found", 404);
  }

  if (!canAccessReimbursement(user, reimbursement)) {
    throw new AppError("User does not have permission to access this resource", 403);
  }

  return response.status(200).json(serializeReimbursement(reimbursement));
});

export const updateReimbursement = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const {
    params: { id },
    body
  } = updateReimbursementSchema.parse({
    params: request.params,
    body: request.body
  });

  const reimbursement = await prisma.reimbursementRequest.findUnique({
    where: { id },
    select: {
      id: true,
      requesterId: true,
      status: true,
      categoryId: true,
      amount: true
    }
  });

  if (!reimbursement) {
    throw new AppError("Reimbursement request not found", 404);
  }

  if (reimbursement.requesterId !== user.id) {
    throw new AppError("User does not have permission to access this resource", 403);
  }

  if (reimbursement.status !== ReimbursementStatus.RASCUNHO) {
    throw new AppError("Only draft reimbursement requests can be edited", 400);
  }

  ensureExpenseDateIsNotInFuture(body.dataDespesa);

  if (body.categoriaId || body.valor !== undefined) {
    const nextAmount = body.valor ?? Number(reimbursement.amount);

    if (body.categoriaId) {
      await ensureActiveCategoryAllowsAmount(body.categoriaId, nextAmount);
    } else {
      await ensureExistingCategoryAllowsAmount(reimbursement.categoryId, nextAmount);
    }
  }

  const updatedReimbursement = await prisma.$transaction(async (transaction) => {
    await transaction.reimbursementRequest.update({
      where: { id },
      data: {
        categoryId: body.categoriaId,
        description: body.descricao,
        amount: body.valor,
        expenseDate: body.dataDespesa
      }
    });

    await transaction.reimbursementHistory.create({
      data: {
        requestId: id,
        userId: user.id,
        action: HistoryAction.UPDATED,
        note: "Solicitação atualizada pelo colaborador"
      }
    });

    return transaction.reimbursementRequest.findUniqueOrThrow({
      where: { id },
      include: reimbursementInclude
    });
  });

  return response.status(200).json(serializeReimbursement(updatedReimbursement));
});

export const submitReimbursement = asyncHandler(async (request, response) => {
  const {
    params: { id }
  } = reimbursementParamsSchema.parse({
    params: request.params
  });

  await ensureRequiredAttachmentBeforeSubmit(request, id);

  const reimbursement = await transitionReimbursement(request, id, {
    action: HistoryAction.SUBMITTED,
    expectedStatus: ReimbursementStatus.RASCUNHO,
    nextStatus: ReimbursementStatus.ENVIADO,
    note: "Solicitacao enviada para analise",
    requireOwner: true
  });

  return response.status(200).json(serializeReimbursement(reimbursement));
});

export const approveReimbursement = asyncHandler(async (request, response) => {
  const {
    params: { id }
  } = reimbursementParamsSchema.parse({
    params: request.params
  });

  const reimbursement = await transitionReimbursement(request, id, {
    action: HistoryAction.APPROVED,
    expectedStatus: ReimbursementStatus.ENVIADO,
    nextStatus: ReimbursementStatus.APROVADO,
    note: "Solicitacao aprovada pelo gestor",
    rejectionReason: null
  });

  return response.status(200).json(serializeReimbursement(reimbursement));
});

export const rejectReimbursement = asyncHandler(async (request, response) => {
  const {
    params: { id },
    body: { justificativaRejeicao }
  } = rejectReimbursementSchema.parse({
    params: request.params,
    body: request.body
  });

  const reimbursement = await transitionReimbursement(request, id, {
    action: HistoryAction.REJECTED,
    expectedStatus: ReimbursementStatus.ENVIADO,
    nextStatus: ReimbursementStatus.REJEITADO,
    note: justificativaRejeicao,
    rejectionReason: justificativaRejeicao
  });

  return response.status(200).json(serializeReimbursement(reimbursement));
});

export const payReimbursement = asyncHandler(async (request, response) => {
  const {
    params: { id }
  } = reimbursementParamsSchema.parse({
    params: request.params
  });

  const reimbursement = await transitionReimbursement(request, id, {
    action: HistoryAction.PAID,
    expectedStatus: ReimbursementStatus.APROVADO,
    nextStatus: ReimbursementStatus.PAGO,
    note: "Pagamento realizado pelo financeiro"
  });

  return response.status(200).json(serializeReimbursement(reimbursement));
});

export const cancelReimbursement = asyncHandler(async (request, response) => {
  const {
    params: { id }
  } = reimbursementParamsSchema.parse({
    params: request.params
  });

  const reimbursement = await transitionReimbursement(request, id, {
    action: HistoryAction.CANCELED,
    expectedStatus: ReimbursementStatus.RASCUNHO,
    nextStatus: ReimbursementStatus.CANCELADO,
    note: "Solicitacao cancelada pelo colaborador",
    requireOwner: true
  });

  return response.status(200).json(serializeReimbursement(reimbursement));
});

export const listReimbursementHistory = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const {
    params: { id }
  } = reimbursementParamsSchema.parse({
    params: request.params
  });

  const reimbursement = await prisma.reimbursementRequest.findUnique({
    where: { id },
    select: {
      id: true,
      requesterId: true,
      status: true
    }
  });

  if (!reimbursement) {
    throw new AppError("Reimbursement request not found", 404);
  }

  if (!canAccessReimbursement(user, reimbursement)) {
    throw new AppError("User does not have permission to access this resource", 403);
  }

  const history = await prisma.reimbursementHistory.findMany({
    where: {
      requestId: id
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      action: true,
      note: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return response.status(200).json(history.map(serializeHistoryEntry));
});

export const createAttachment = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const {
    params: { id },
    body: { nomeArquivo, tipoArquivo, urlArquivo }
  } = createAttachmentSchema.parse({
    params: request.params,
    body: request.body
  });

  const reimbursement = await prisma.reimbursementRequest.findUnique({
    where: { id },
    select: {
      id: true,
      requesterId: true,
      status: true
    }
  });

  if (!reimbursement) {
    throw new AppError("Reimbursement request not found", 404);
  }

  if (reimbursement.requesterId !== user.id) {
    throw new AppError("User does not have permission to access this resource", 403);
  }

  if (reimbursement.status !== ReimbursementStatus.RASCUNHO) {
    throw new AppError("Attachments can only be added to draft reimbursement requests", 400);
  }

  const attachment = await prisma.attachment.create({
    data: {
      requestId: id,
      fileName: nomeArquivo,
      fileUrl: urlArquivo,
      fileType: tipoArquivo
    },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      fileType: true,
      createdAt: true
    }
  });

  return response.status(201).json(serializeAttachment(attachment));
});

export const listAttachments = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const {
    params: { id }
  } = reimbursementParamsSchema.parse({
    params: request.params
  });

  const reimbursement = await prisma.reimbursementRequest.findUnique({
    where: { id },
    select: {
      id: true,
      requesterId: true,
      status: true
    }
  });

  if (!reimbursement) {
    throw new AppError("Reimbursement request not found", 404);
  }

  if (!canAccessReimbursement(user, reimbursement)) {
    throw new AppError("User does not have permission to access this resource", 403);
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      requestId: id
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      fileType: true,
      createdAt: true
    }
  });

  return response.status(200).json(attachments.map(serializeAttachment));
});
