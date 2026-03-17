import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import type { Response } from "express";

import type { AuthenticatedRequest } from "../../common/authenticated-request";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { AUTH_COOKIE_NAME } from "../auth/auth.constants";
import { SellerOnboardingService } from "./seller-onboarding.service";

@Controller("seller-onboarding")
export class SellerOnboardingController {
  constructor(
    private readonly sellerOnboardingService: SellerOnboardingService
  ) {}

  @Post("applications")
  @UseGuards(RateLimitGuard)
  @RateLimit("SELLER_APPLICATION_CREATE")
  createApplication(@Body() body: unknown) {
    return this.sellerOnboardingService.createApplication(body);
  }

  @Get("activation/:token")
  getActivationPreview(@Param("token") token: string) {
    return this.sellerOnboardingService.getActivationPreview(token);
  }

  @Post("activation/:token")
  @UseGuards(RateLimitGuard)
  @RateLimit("SELLER_ACTIVATION")
  async activate(
    @Param("token") token: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.sellerOnboardingService.activate(token, body, {
      ipAddress: request.ip,
      userAgent:
        typeof request.headers["user-agent"] === "string"
          ? request.headers["user-agent"]
          : undefined
    });

    response.cookie(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(result.response.session.expiresAt)
    });

    return result.response;
  }
}
