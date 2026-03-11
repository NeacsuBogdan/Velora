import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN", "CUSTOMER", "SELLER")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("overview")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.ordersService.getOverview(viewer);
  }

  @Get()
  listOrders(@CurrentUser() viewer: AuthenticatedUser) {
    return this.ordersService.listOrders(viewer);
  }

  @Get(":number")
  getOrderDetail(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("number") number: string
  ) {
    return this.ordersService.getOrderDetail(viewer, number);
  }
}
