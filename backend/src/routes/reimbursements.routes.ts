import { Role } from "@prisma/client";
import { Router } from "express";

import {
  approveReimbursement,
  cancelReimbursement,
  createAttachment,
  createReimbursement,
  getReimbursementsSummary,
  getReimbursementById,
  listAttachments,
  listReimbursementHistory,
  listReimbursements,
  payReimbursement,
  rejectReimbursement,
  submitReimbursement,
  updateReimbursement
} from "../controllers/reimbursements.controller";
import { authenticate } from "../middlewares/authentication";
import { authorizeRoles } from "../middlewares/authorization";

export const reimbursementsRouter = Router();

reimbursementsRouter.get("/", authenticate, listReimbursements);
reimbursementsRouter.get("/summary", authenticate, getReimbursementsSummary);
reimbursementsRouter.post("/", authenticate, authorizeRoles(Role.COLABORADOR), createReimbursement);
reimbursementsRouter.post(
  "/:id/submit",
  authenticate,
  authorizeRoles(Role.COLABORADOR),
  submitReimbursement
);
reimbursementsRouter.post(
  "/:id/approve",
  authenticate,
  authorizeRoles(Role.GESTOR),
  approveReimbursement
);
reimbursementsRouter.post(
  "/:id/reject",
  authenticate,
  authorizeRoles(Role.GESTOR),
  rejectReimbursement
);
reimbursementsRouter.post("/:id/pay", authenticate, authorizeRoles(Role.FINANCEIRO), payReimbursement);
reimbursementsRouter.post(
  "/:id/cancel",
  authenticate,
  authorizeRoles(Role.COLABORADOR),
  cancelReimbursement
);
reimbursementsRouter.get("/:id/history", authenticate, listReimbursementHistory);
reimbursementsRouter.post(
  "/:id/attachments",
  authenticate,
  authorizeRoles(Role.COLABORADOR),
  createAttachment
);
reimbursementsRouter.get("/:id/attachments", authenticate, listAttachments);
reimbursementsRouter.get("/:id", authenticate, getReimbursementById);
reimbursementsRouter.put("/:id", authenticate, authorizeRoles(Role.COLABORADOR), updateReimbursement);
