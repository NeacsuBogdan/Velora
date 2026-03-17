import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { SellerOnboardingService } from "./seller-onboarding.service";

@Controller("admin/seller-applications")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminSellerApplicationsController {
  constructor(
    private readonly sellerOnboardingService: SellerOnboardingService
  ) {}

  @Get()
  listApplications(@Query() query: Record<string, unknown>) {
    return this.sellerOnboardingService.listApplications(query);
  }

  @Patch(":applicationId/review")
  reviewApplication(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("applicationId") applicationId: string,
    @Body() body: unknown
  ) {
    return this.sellerOnboardingService.reviewApplication(
      viewer,
      applicationId,
      body
    );
  }
}
