import {
  CanActivate,
  Injectable,
  UnauthorizedException,
  type ExecutionContext
} from "@nestjs/common";

import { AUTH_COOKIE_NAME } from "../../modules/auth/auth.constants";
import { AuthService } from "../../modules/auth/auth.service";
import type { AuthenticatedRequest } from "../authenticated-request";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { cookies?: Record<string, string> }>();
    const rawToken = request.cookies?.[AUTH_COOKIE_NAME];

    if (!rawToken) {
      throw new UnauthorizedException("Authentication required.");
    }

    const session = await this.authService.getSessionFromToken(rawToken);

    if (!session) {
      throw new UnauthorizedException("Session is invalid or expired.");
    }

    request.auth = session;
    return true;
  }
}
