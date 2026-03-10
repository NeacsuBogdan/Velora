import { Injectable } from "@nestjs/common";

import { healthResponseSchema, type HealthResponse } from "@velora/contracts";

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      status: "ok",
      service: "velora-api",
      environment:
        process.env.NODE_ENV === "production"
          ? "production"
          : process.env.NODE_ENV === "test"
            ? "test"
            : "development",
      timestamp: new Date().toISOString(),
      version: "0.1.0"
    });
  }
}
