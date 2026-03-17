import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { SellerService } from "./seller.service";

@Controller("seller")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("SELLER")
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Get("dashboard")
  getDashboard(@CurrentUser() viewer: AuthenticatedUser) {
    return this.sellerService.getDashboard(viewer);
  }

  @Get("listings")
  listListings(@CurrentUser() viewer: AuthenticatedUser) {
    return this.sellerService.listListings(viewer);
  }

  @Patch("inventory/:inventoryItemId")
  updateInventory(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("inventoryItemId") inventoryItemId: string,
    @Body() body: unknown
  ) {
    return this.sellerService.updateInventory(viewer, inventoryItemId, body);
  }

  @Patch("listings/:listingId")
  updateListing(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("listingId") listingId: string,
    @Body() body: unknown
  ) {
    return this.sellerService.updateListing(viewer, listingId, body);
  }

  @Get("orders")
  listOrders(@CurrentUser() viewer: AuthenticatedUser) {
    return this.sellerService.listOrders(viewer);
  }

  @Get("orders/:number")
  getOrderDetail(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("number") number: string
  ) {
    return this.sellerService.getOrderDetail(viewer, number);
  }
}
