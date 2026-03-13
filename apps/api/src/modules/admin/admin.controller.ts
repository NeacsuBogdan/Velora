import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get("catalog-options")
  getCatalogOptions() {
    return this.adminService.getCatalogOptions();
  }

  @Get("categories")
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post("categories")
  createCategory(@CurrentUser() viewer: AuthenticatedUser, @Body() body: unknown) {
    return this.adminService.createCategory(viewer, body);
  }

  @Patch("categories/:categoryId")
  updateCategory(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("categoryId") categoryId: string,
    @Body() body: unknown
  ) {
    return this.adminService.updateCategory(viewer, categoryId, body);
  }

  @Delete("categories/:categoryId")
  deleteCategory(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("categoryId") categoryId: string
  ) {
    return this.adminService.deleteCategory(viewer, categoryId);
  }

  @Get("products")
  listProducts(@Query() query: Record<string, unknown>) {
    return this.adminService.listProducts(query);
  }

  @Post("products")
  createProduct(@CurrentUser() viewer: AuthenticatedUser, @Body() body: unknown) {
    return this.adminService.createProduct(viewer, body);
  }

  @Patch("products/:productId")
  updateProduct(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("productId") productId: string,
    @Body() body: unknown
  ) {
    return this.adminService.updateProduct(viewer, productId, body);
  }

  @Delete("products/:productId")
  archiveProduct(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("productId") productId: string
  ) {
    return this.adminService.archiveProduct(viewer, productId);
  }

  @Get("inventory")
  listInventory(@Query() query: Record<string, unknown>) {
    return this.adminService.listInventory(query);
  }

  @Patch("inventory/:inventoryItemId")
  updateInventory(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("inventoryItemId") inventoryItemId: string,
    @Body() body: unknown
  ) {
    return this.adminService.updateInventory(viewer, inventoryItemId, body);
  }

  @Get("orders")
  listOrders(@Query() query: Record<string, unknown>) {
    return this.adminService.listOrders(query);
  }

  @Get("orders/:number")
  getOrderDetail(@Param("number") number: string) {
    return this.adminService.getOrderDetail(number);
  }

  @Patch("orders/:number/status")
  updateOrderStatus(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("number") number: string,
    @Body() body: unknown
  ) {
    return this.adminService.updateOrderStatus(viewer, number, body);
  }

  @Get("customers")
  listCustomers(@Query() query: Record<string, unknown>) {
    return this.adminService.listCustomers(query);
  }

  @Get("sellers")
  listSellers(@Query() query: Record<string, unknown>) {
    return this.adminService.listSellers(query);
  }

  @Patch("sellers/:sellerId")
  updateSeller(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("sellerId") sellerId: string,
    @Body() body: unknown
  ) {
    return this.adminService.updateSeller(viewer, sellerId, body);
  }

  @Get("operations")
  getOperationsOverview() {
    return this.adminService.getOperationsOverview();
  }

  @Post("operations/reindex")
  triggerReindex(@CurrentUser() viewer: AuthenticatedUser, @Body() body: unknown) {
    return this.adminService.triggerReindex(viewer, body);
  }

  @Post("operations/release-expired-reservations")
  releaseExpiredReservations(@CurrentUser() viewer: AuthenticatedUser) {
    return this.adminService.releaseExpiredReservations(viewer);
  }
}
