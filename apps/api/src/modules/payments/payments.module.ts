import { Controller, Get, Injectable, Module, UseGuards } from "@nestjs/common";
import { domainOverviewSchema } from "@velora/contracts";

import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { PrismaService } from "../database/prisma.service";

@Injectable()
class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [attemptCount, eventCount, refundCount, webhookCount] =
      await Promise.all([
        this.prisma.paymentAttempt.count(),
        this.prisma.paymentEvent.count(),
        this.prisma.refundRecord.count(),
        this.prisma.webhookDeliveryRecord.count()
      ]);

    return domainOverviewSchema.parse({
      scope: "payments",
      metrics: {
        attempts: attemptCount,
        events: eventCount,
        refunds: refundCount,
        webhooks: webhookCount
      },
      notes: ["Administrative visibility for payment lifecycle records."]
    });
  }
}

@Controller("payments")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN")
class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("overview")
  getOverview() {
    return this.paymentsService.getOverview();
  }
}

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}
