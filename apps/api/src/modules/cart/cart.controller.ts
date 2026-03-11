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
import { CartService } from "./cart.service";

@Controller("cart")
@UseGuards(SessionAuthGuard, RolesGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get("overview")
  @Roles("ADMIN", "CUSTOMER")
  getOverview(@CurrentUser() viewer: AuthenticatedUser) {
    return this.cartService.getOverview(viewer);
  }

  @Get()
  @Roles("CUSTOMER")
  getCart(@CurrentUser() viewer: AuthenticatedUser) {
    return this.cartService.getCart(viewer);
  }

  @Post("items")
  @Roles("CUSTOMER")
  addItem(@CurrentUser() viewer: AuthenticatedUser, @Body() body: unknown) {
    return this.cartService.addItem(viewer, body);
  }

  @Patch("items/:itemId")
  @Roles("CUSTOMER")
  updateItem(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body() body: unknown
  ) {
    return this.cartService.updateItem(viewer, itemId, body);
  }

  @Delete("items/:itemId")
  @Roles("CUSTOMER")
  removeItem(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("itemId") itemId: string
  ) {
    return this.cartService.removeItem(viewer, itemId);
  }
}
