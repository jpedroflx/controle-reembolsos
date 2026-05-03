import { Role } from "@prisma/client";
import { Router } from "express";

import {
  createCategory,
  listCategories,
  updateCategory
} from "../controllers/categories.controller";
import { authenticate } from "../middlewares/authentication";
import { authorizeRoles } from "../middlewares/authorization";

export const categoriesRouter = Router();

categoriesRouter.get("/", authenticate, listCategories);
categoriesRouter.post("/", authenticate, authorizeRoles(Role.ADMIN), createCategory);
categoriesRouter.put("/:id", authenticate, authorizeRoles(Role.ADMIN), updateCategory);
