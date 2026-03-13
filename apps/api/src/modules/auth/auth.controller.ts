import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import type { Response } from "express";
import { loginRequestSchema, type LoginRequest } from "@velora/contracts";

import type { AuthenticatedRequest } from "../../common/authenticated-request";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { parseWithSchema } from "../../common/zod";
import { AUTH_COOKIE_NAME } from "./auth.constants";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @UseGuards(RateLimitGuard)
  @RateLimit("AUTH_LOGIN")
  async login(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const payload = parseWithSchema<LoginRequest>(loginRequestSchema, body);
    const { token, session } = await this.authService.login(payload, {
      ipAddress: request.ip,
      userAgent:
        typeof request.headers["user-agent"] === "string"
          ? request.headers["user-agent"]
          : undefined
    });

    response.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt)
    });

    return session;
  }

  @Post("logout")
  async logout(
    @Req() request: AuthenticatedRequest & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) response: Response
  ) {
    const token = request.cookies?.[AUTH_COOKIE_NAME];

    if (token) {
      await this.authService.logout(token);
    }

    response.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    return { success: true };
  }

  @Get("session")
  @UseGuards(SessionAuthGuard)
  getSession(@Req() request: AuthenticatedRequest) {
    return request.auth;
  }
}
