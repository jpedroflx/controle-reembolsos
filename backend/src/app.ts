import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found-handler";
import { authRouter } from "./routes/auth.routes";
import { categoriesRouter } from "./routes/categories.routes";
import { healthRouter } from "./routes/health.routes";
import { reimbursementsRouter } from "./routes/reimbursements.routes";
import { usersRouter } from "./routes/users.routes";

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN
  })
);
app.use(express.json());

app.use("/auth", authRouter);
app.use("/categories", categoriesRouter);
app.use("/health", healthRouter);
app.use("/reimbursements", reimbursementsRouter);
app.use("/users", usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
