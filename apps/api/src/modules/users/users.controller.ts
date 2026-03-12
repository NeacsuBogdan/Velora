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
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(SessionAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getCurrentUserProfile(@CurrentUser() viewer: AuthenticatedUser) {
    return this.usersService.getCurrentUserProfile(viewer);
  }

  @Patch("me")
  updateCurrentUserProfile(
    @CurrentUser() viewer: AuthenticatedUser,
    @Body() body: unknown
  ) {
    return this.usersService.updateCurrentUserProfile(viewer, body);
  }

  @Get("addresses")
  listAddresses(@CurrentUser() viewer: AuthenticatedUser) {
    return this.usersService.listAddresses(viewer);
  }

  @Post("addresses")
  createAddress(
    @CurrentUser() viewer: AuthenticatedUser,
    @Body() body: unknown
  ) {
    return this.usersService.createAddress(viewer, body);
  }

  @Patch("addresses/:addressId")
  updateAddress(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("addressId") addressId: string,
    @Body() body: unknown
  ) {
    return this.usersService.updateAddress(viewer, addressId, body);
  }

  @Delete("addresses/:addressId")
  deleteAddress(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("addressId") addressId: string
  ) {
    return this.usersService.deleteAddress(viewer, addressId);
  }
}
