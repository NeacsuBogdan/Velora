import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(SessionAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("overview")
  @Roles("ADMIN")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.inventoryService.getOverview(viewer);
  }

  @Post("reservations/release-expired")
  @Roles("ADMIN")
  releaseExpiredReservations(@CurrentUser() viewer: AuthenticatedUser) {
    return this.inventoryService.releaseExpiredReservations(viewer.id);
  }
}
