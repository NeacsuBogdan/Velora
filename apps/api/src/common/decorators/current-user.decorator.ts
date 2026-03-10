import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import type { AuthenticatedRequest } from "../authenticated-request";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    return request.auth?.user;
  }
);
