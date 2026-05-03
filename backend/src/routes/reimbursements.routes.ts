import { Role } from "@prisma/client";
import { Router } from "express";

import {
  createReimbursement,
  getReimbursementById,
  listReimbursements,
  updateReimbursement
} from "../controllers/reimbursements.controller";
import { authenticate } from "../middlewares/authentication";
import { authorizeRoles } from "../middlewares/authorization";

export const reimbursementsRouter = Router();

reimbursementsRouter.get("/", authenticate, listReimbursements);
reimbursementsRouter.post("/", authenticate, authorizeRoles(Role.COLABORADOR), createReimbursement);
reimbursementsRouter.get("/:id", authenticate, getReimbursementById);
reimbursementsRouter.put("/:id", authenticate, authorizeRoles(Role.COLABORADOR), updateReimbursement);
