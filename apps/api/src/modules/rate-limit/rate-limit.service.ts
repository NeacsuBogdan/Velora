import {
  Injectable,
  Logger
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { AuthenticatedRequest } from "../../common/authenticated-request";
import { PlatformCacheService } from "../platform-cache/platform-cache.service";
import type {
  RateLimitPreset,
  RateLimitPresetConfig
} from "./rate-limit.types";

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    private readonly cacheService: PlatformCacheService,
    private readonly configService: ConfigService
  ) {}

  async consume(preset: RateLimitPreset, request: AuthenticatedRequest) {
    const config = this.getPresetConfig(preset);
    const identity = this.resolveIdentity(config.identity, request);
    const key = `rate-limit:${preset}:${identity}`;
    const { count, retryAfterSeconds } = await this.cacheService.incrementCounter(
      key,
      config.windowSeconds
    );
    const blocked = count > config.limit;

    if (blocked) {
      this.logger.warn(
        `Rate limit triggered for ${preset} on ${identity}.`
      );
    }

    return {
      blocked,
      limit: config.limit,
      remaining: Math.max(config.limit - count, 0),
      retryAfterSeconds
    };
  }

  private resolveIdentity(
    identity: RateLimitPresetConfig["identity"],
    request: AuthenticatedRequest
  ) {
    if (identity === "viewer_or_ip") {
      return request.auth?.user.id ?? request.ip ?? "anonymous";
    }

    return request.ip ?? "anonymous";
  }

  private getPresetConfig(preset: RateLimitPreset): RateLimitPresetConfig {
    if (preset === "AUTH_LOGIN") {
      return {
        identity: "ip",
        limit: this.configService.get<number>("RATE_LIMIT_LOGIN_MAX") ?? 10,
        windowSeconds:
          this.configService.get<number>("RATE_LIMIT_LOGIN_WINDOW_SECONDS") ?? 60
      };
    }

    if (preset === "CART_COUPON") {
      return {
        identity: "viewer_or_ip",
        limit: this.configService.get<number>("RATE_LIMIT_COUPON_MAX") ?? 10,
        windowSeconds:
          this.configService.get<number>("RATE_LIMIT_COUPON_WINDOW_SECONDS") ?? 60
      };
    }

    if (preset === "CHECKOUT_CREATE") {
      return {
        identity: "viewer_or_ip",
        limit: this.configService.get<number>("RATE_LIMIT_CHECKOUT_MAX") ?? 12,
        windowSeconds:
          this.configService.get<number>("RATE_LIMIT_CHECKOUT_WINDOW_SECONDS") ??
          300
      };
    }

    if (preset === "PAYMENT_ATTEMPT_CREATE") {
      return {
        identity: "viewer_or_ip",
        limit:
          this.configService.get<number>("RATE_LIMIT_PAYMENT_ATTEMPT_MAX") ?? 10,
        windowSeconds:
          this.configService.get<number>(
            "RATE_LIMIT_PAYMENT_ATTEMPT_WINDOW_SECONDS"
          ) ?? 300
      };
    }

    return {
      identity: "viewer_or_ip",
      limit:
        this.configService.get<number>("RATE_LIMIT_PAYMENT_CONFIRM_MAX") ?? 18,
      windowSeconds:
        this.configService.get<number>(
          "RATE_LIMIT_PAYMENT_CONFIRM_WINDOW_SECONDS"
        ) ?? 300
    };
  }
}
