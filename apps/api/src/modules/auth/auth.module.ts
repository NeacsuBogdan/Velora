import { Global, Module } from "@nestjs/common";

import { OptionalSessionAuthGuard } from "../../common/guards/optional-session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionAuthGuard,
    OptionalSessionAuthGuard,
    RolesGuard
  ],
  exports: [AuthService, SessionAuthGuard, OptionalSessionAuthGuard, RolesGuard]
})
export class AuthModule {}
