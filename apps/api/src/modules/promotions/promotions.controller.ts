import {
  Body,
  Controller,
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
import { PromotionsService } from "./promotions.service";

@Controller("promotions")
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get("overview")
  getOverview() {
    return this.promotionsService.getOverview();
  }

  @Get()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("ADMIN")
  listPromotions() {
    return this.promotionsService.listPromotions();
  }

  @Post()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("ADMIN")
  createPromotion(
    @CurrentUser() viewer: AuthenticatedUser,
    @Body() body: unknown
  ) {
    return this.promotionsService.createPromotion(viewer, body);
  }

  @Patch(":promotionId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("ADMIN")
  updatePromotion(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("promotionId") promotionId: string,
    @Body() body: unknown
  ) {
    return this.promotionsService.updatePromotion(viewer, promotionId, body);
  }
}
