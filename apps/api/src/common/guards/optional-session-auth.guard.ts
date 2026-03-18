import {
  CanActivate,
  Injectable,
  type ExecutionContext
} from "@nestjs/common";

import { AUTH_COOKIE_NAME } from "../../modules/auth/auth.constants";
import { AuthService } from "../../modules/auth/auth.service";
import type { AuthenticatedRequest } from "../authenticated-request";

@Injectable()
export class OptionalSessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { cookies?: Record<string, string> }>();
    const rawToken = request.cookies?.[AUTH_COOKIE_NAME];

    if (!rawToken) {
      return true;
    }

    const session = await this.authService.getSessionFromToken(rawToken);

    if (session) {
      request.auth = session;
    }

    return true;
  }
}

