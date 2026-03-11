import { Controller, Get, UseGuards } from "@nestjs/common";

import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { AuditService } from "./audit.service";

@Controller("audit")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("overview")
  getOverview() {
    return this.auditService.getOverview();
  }
}
