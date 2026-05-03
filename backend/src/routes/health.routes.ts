import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  return response.status(200).json({
    service: "controle-reembolsos-api",
    status: "ok"
  });
});
