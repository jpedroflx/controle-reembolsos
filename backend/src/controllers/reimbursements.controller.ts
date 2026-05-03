import {
  HistoryAction,
  ReimbursementStatus,
  Role,
  type Prisma,
  type ReimbursementRequest
} from "@prisma/client";
import type { Request } from "express";

import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";
import {
  createReimbursementSchema,
  reimbursementParamsSchema,
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
      active: true
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

function canAccessReimbursement(user: Express.AuthenticatedUser, reimbursement: ReimbursementRequest) {
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
      ativo: reimbursement.category.active
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

async function ensureActiveCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      active: true
    }
  });

  if (!category || !category.active) {
    throw new AppError("Category not found or inactive", 400);
  }
}

export const listReimbursements = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);

  const reimbursements = await prisma.reimbursementRequest.findMany({
    where: getListWhereByRole(user),
    orderBy: {
      createdAt: "desc"
    },
    include: reimbursementInclude
  });

  return response.status(200).json(reimbursements.map(serializeReimbursement));
});

export const createReimbursement = asyncHandler(async (request, response) => {
  const user = getAuthenticatedUser(request);
  const { categoriaId, dataDespesa, descricao, valor } = createReimbursementSchema.parse({
    body: request.body
  }).body;

  await ensureActiveCategory(categoriaId);

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
    throw new AppError("Only draft reimbursement requests can be edited", 400);
  }

  if (body.categoriaId) {
    await ensureActiveCategory(body.categoriaId);
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
