import { Controller, Get, Injectable, Module, UseGuards } from "@nestjs/common";
import {
  domainOverviewSchema,
  type AuthenticatedUser
} from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { PrismaService } from "../database/prisma.service";

@Injectable()
class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(viewer: AuthenticatedUser) {
    const isAdmin = viewer.roles.some((role) => role.code === "ADMIN");
    const checkoutWhere = isAdmin ? undefined : { userId: viewer.id };

    const [sessionCount, pendingCount, reservedCount] = await Promise.all([
      this.prisma.checkoutSession.count({ where: checkoutWhere }),
      this.prisma.checkoutSession.count({
        where: {
          ...(checkoutWhere ?? {}),
          status: "PAYMENT_PENDING"
        }
      }),
      this.prisma.stockReservation.count({
        where: isAdmin
          ? { checkoutSessionId: { not: null } }
          : { checkoutSession: { userId: viewer.id } }
      })
    ]);

    return domainOverviewSchema.parse({
      scope: "checkout",
      metrics: {
        sessions: sessionCount,
        paymentPending: pendingCount,
        reservedUnits: reservedCount
      },
      notes: [
        isAdmin
          ? "Admin overview across checkout sessions."
          : "Customer-scoped checkout state."
      ]
    });
  }
}

@Controller("checkout")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN", "CUSTOMER")
class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get("overview")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.checkoutService.getOverview(viewer);
  }
}

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService]
})
export class CheckoutModule {}
