import { Role } from "@prisma/client";
import { Router } from "express";

import { createUser, listUsers } from "../controllers/users.controller";
import { authenticate } from "../middlewares/authentication";
import { authorizeRoles } from "../middlewares/authorization";

export const usersRouter = Router();

usersRouter.post("/", createUser);
usersRouter.get("/", authenticate, authorizeRoles(Role.ADMIN), listUsers);
