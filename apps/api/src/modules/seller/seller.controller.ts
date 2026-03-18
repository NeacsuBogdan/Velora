import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
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

  @Get("catalog-options")
  listCatalogOptions(@CurrentUser() viewer: AuthenticatedUser) {
    return this.sellerService.listCatalogOptions(viewer);
  }

  @Get("creation-options")
  getProductCreationOptions(@CurrentUser() viewer: AuthenticatedUser) {
    return this.sellerService.getProductCreationOptions(viewer);
  }

  @Post("catalog-products")
  createCatalogProduct(
    @CurrentUser() viewer: AuthenticatedUser,
    @Body() body: unknown
  ) {
    return this.sellerService.createCatalogProduct(viewer, body);
  }

  @Patch("catalog-products/:productId")
  updateCatalogProduct(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("productId") productId: string,
    @Body() body: unknown
  ) {
    return this.sellerService.updateCatalogProduct(viewer, productId, body);
  }

  @Post("listings")
  createListing(
    @CurrentUser() viewer: AuthenticatedUser,
    @Body() body: unknown
  ) {
    return this.sellerService.createListing(viewer, body);
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

  @Patch("listings/:listingId/reactivate")
  reactivateListing(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("listingId") listingId: string
  ) {
    return this.sellerService.reactivateListing(viewer, listingId);
  }

  @Delete("listings/:listingId")
  archiveListing(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("listingId") listingId: string
  ) {
    return this.sellerService.archiveListing(viewer, listingId);
  }

  @Delete("catalog-products/:productId")
  deleteCatalogProduct(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("productId") productId: string
  ) {
    return this.sellerService.deleteCatalogProduct(viewer, productId);
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

  @Patch("orders/:number/status")
  updateOrderStatus(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("number") number: string,
    @Body() body: unknown
  ) {
    return this.sellerService.updateOrderStatus(viewer, number, body);
  }
}
