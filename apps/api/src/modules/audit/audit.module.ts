import { Controller, Get, Injectable, Module, UseGuards } from "@nestjs/common";
import { domainOverviewSchema } from "@velora/contracts";

import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { PrismaService } from "../database/prisma.service";

@Injectable()
class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [auditCount, jobRunCount, webhookCount] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.jobRun.count(),
      this.prisma.webhookDeliveryRecord.count()
    ]);

    return domainOverviewSchema.parse({
      scope: "audit",
      metrics: {
        auditLogs: auditCount,
        jobRuns: jobRunCount,
        webhookRecords: webhookCount
      },
      notes: ["Administrative audit and job execution visibility."]
    });
  }
}

@Controller("audit")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN")
class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("overview")
  getOverview() {
    return this.auditService.getOverview();
  }
}

@Module({
  controllers: [AuditController],
  providers: [AuditService]
})
export class AuditModule {}
