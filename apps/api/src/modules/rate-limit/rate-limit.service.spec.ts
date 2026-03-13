import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedRequest } from "../../common/authenticated-request";
import { RateLimitService } from "./rate-limit.service";

describe("RateLimitService", () => {
  const cacheService = {
    incrementCounter: vi.fn()
  };
  const configService = {
    get: vi.fn((key: string) => {
      const values: Record<string, number> = {
        RATE_LIMIT_LOGIN_MAX: 2,
        RATE_LIMIT_LOGIN_WINDOW_SECONDS: 60
      };

      return values[key];
    })
  };

  let service: RateLimitService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RateLimitService(cacheService as never, configService as never);
  });

  it("uses the authenticated viewer id for protected endpoint presets", async () => {
    cacheService.incrementCounter.mockResolvedValue({
      count: 1,
      retryAfterSeconds: 300
    });

    await service.consume("CHECKOUT_CREATE", {
      auth: {
        sessionId: "session-1",
        expiresAt: new Date().toISOString(),
        user: {
          id: "customer-1",
          email: "customer@velora.local",
          firstName: "Demo",
          lastName: "Customer",
          roles: [
            {
              code: "CUSTOMER",
              name: "Customer"
            }
          ]
        }
      }
    } as AuthenticatedRequest);

    expect(cacheService.incrementCounter).toHaveBeenCalledWith(
      "rate-limit:CHECKOUT_CREATE:customer-1",
      300
    );
  });

  it("blocks a login request after the configured threshold is crossed", async () => {
    cacheService.incrementCounter.mockResolvedValue({
      count: 3,
      retryAfterSeconds: 42
    });

    const result = await service.consume("AUTH_LOGIN", {
      ip: "127.0.0.1"
    } as AuthenticatedRequest);

    expect(result.blocked).toBe(true);
    expect(result.limit).toBe(2);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBe(42);
    expect(cacheService.incrementCounter).toHaveBeenCalledWith(
      "rate-limit:AUTH_LOGIN:127.0.0.1",
      60
    );
  });
});
