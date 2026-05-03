import request from "supertest";

import { app } from "../app";

describe("GET /health", () => {
  it("returns API status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      service: "controle-reembolsos-api",
      status: "ok"
    });
  });
});
