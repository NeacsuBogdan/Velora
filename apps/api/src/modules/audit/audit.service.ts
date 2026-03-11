import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { domainOverviewSchema } from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";

@Injectable()
export class AuditService {
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

  async record(
    actorUserId: string | null | undefined,
    entityType: string,
    entityId: string,
    action: string,
    details?: Record<string, unknown>
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? undefined,
        entityType,
        entityId,
        action,
        details: (details as Prisma.InputJsonValue | undefined) ?? undefined
      }
    });
  }
}
