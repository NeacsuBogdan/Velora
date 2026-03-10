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
class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(viewer: AuthenticatedUser) {
    const isAdmin = viewer.roles.some((role) => role.code === "ADMIN");
    const isSeller = viewer.roles.some((role) => role.code === "SELLER");
    const sellerScope = isSeller
      ? await this.prisma.seller.findUnique({
          where: { ownerUserId: viewer.id }
        })
      : null;

    const orderWhere = isAdmin
      ? undefined
      : sellerScope
        ? { sellerId: sellerScope.id }
        : { userId: viewer.id };

    const [orderCount, orderItemCount, historyCount] = await Promise.all([
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.orderItem.count({
        where: isAdmin
          ? undefined
          : sellerScope
            ? { listing: { sellerId: sellerScope.id } }
            : { order: { userId: viewer.id } }
      }),
      this.prisma.orderStatusHistory.count({
        where: isAdmin
          ? undefined
          : sellerScope
            ? { order: { sellerId: sellerScope.id } }
            : { order: { userId: viewer.id } }
      })
    ]);

    return domainOverviewSchema.parse({
      scope: "orders",
      metrics: {
        orders: orderCount,
        orderItems: orderItemCount,
        statusEvents: historyCount
      },
      notes: [
        isAdmin
          ? "Admin visibility across all order state."
          : sellerScope
            ? `Seller scope for ${sellerScope.displayName}.`
            : "Customer order history scope."
      ]
    });
  }
}

@Controller("orders")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN", "CUSTOMER", "SELLER")
class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("overview")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.ordersService.getOverview(viewer);
  }
}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
