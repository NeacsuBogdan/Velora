import { Controller, Get, Module, Req, UseGuards } from "@nestjs/common";

import type { AuthenticatedRequest } from "../../common/authenticated-request";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";

@Controller("users")
@UseGuards(SessionAuthGuard)
class UsersController {
  @Get("me")
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return request.auth?.user;
  }
}

@Module({
  controllers: [UsersController]
})
export class UsersModule {}
