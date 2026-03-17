import { Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getFeed(
    @CurrentUser() viewer: AuthenticatedUser,
    @Query() query: Record<string, unknown>
  ) {
    return this.notificationsService.getFeed(viewer, query);
  }

  @Patch(":notificationId/read")
  markRead(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param("notificationId") notificationId: string
  ) {
    return this.notificationsService.markRead(viewer, notificationId);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() viewer: AuthenticatedUser) {
    return this.notificationsService.markAllRead(viewer);
  }
}
