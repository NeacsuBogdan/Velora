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
class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(viewer: AuthenticatedUser) {
    const sellerScope = viewer.roles.some((role) => role.code === "SELLER")
      ? await this.prisma.seller.findUnique({
          where: { ownerUserId: viewer.id }
        })
      : null;

    const [itemCount, reservationCount, movementCount] = await Promise.all([
      this.prisma.inventoryItem.count({
        where: sellerScope
          ? { listing: { sellerId: sellerScope.id } }
          : undefined
      }),
      this.prisma.stockReservation.count({
        where: sellerScope
          ? { inventoryItem: { listing: { sellerId: sellerScope.id } } }
          : undefined
      }),
      this.prisma.inventoryMovement.count({
        where: sellerScope
          ? { inventoryItem: { listing: { sellerId: sellerScope.id } } }
          : undefined
      })
    ]);

    return domainOverviewSchema.parse({
      scope: "inventory",
      metrics: {
        items: itemCount,
        reservations: reservationCount,
        movements: movementCount
      },
      notes: [
        sellerScope
          ? `Scoped to seller ${sellerScope.displayName}.`
          : "Admin scope across the full inventory footprint."
      ]
    });
  }
}

@Controller("inventory")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN", "SELLER")
class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("overview")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.inventoryService.getOverview(viewer);
  }
}

@Module({
  controllers: [InventoryController],
  providers: [InventoryService]
})
export class InventoryModule {}
