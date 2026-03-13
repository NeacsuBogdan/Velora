import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";

import type { AuthenticatedRequest } from "../authenticated-request";
import { RATE_LIMIT_METADATA_KEY } from "../decorators/rate-limit.decorator";
import { RateLimitService } from "../../modules/rate-limit/rate-limit.service";
import type { RateLimitPreset } from "../../modules/rate-limit/rate-limit.types";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  async canActivate(context: ExecutionContext) {
    const preset = this.reflector.getAllAndOverride<RateLimitPreset>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!preset) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const state = await this.rateLimitService.consume(preset, request);

    response.setHeader("X-RateLimit-Limit", state.limit.toString());
    response.setHeader("X-RateLimit-Remaining", state.remaining.toString());
    response.setHeader("X-RateLimit-Reset", state.retryAfterSeconds.toString());

    if (state.blocked) {
      response.setHeader("Retry-After", state.retryAfterSeconds.toString());
      throw new HttpException(
        `Too many requests for ${preset.toLowerCase()}.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
