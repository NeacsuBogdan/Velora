import { Controller, Get, Injectable, Module, UseGuards } from "@nestjs/common";
import { domainOverviewSchema } from "@velora/contracts";

import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { PrismaService } from "../database/prisma.service";

@Injectable()
class SearchSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [documentCount, reindexCount, syncLogCount] = await Promise.all([
      this.prisma.searchDocument.count(),
      this.prisma.reindexJob.count(),
      this.prisma.searchSyncLog.count()
    ]);

    return domainOverviewSchema.parse({
      scope: "search-sync",
      metrics: {
        documents: documentCount,
        reindexJobs: reindexCount,
        syncLogs: syncLogCount
      },
      notes: ["Administrative visibility into search projection health."]
    });
  }
}

@Controller("search-sync")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("ADMIN")
class SearchSyncController {
  constructor(private readonly searchSyncService: SearchSyncService) {}

  @Get("overview")
  getOverview() {
    return this.searchSyncService.getOverview();
  }
}

@Module({
  controllers: [SearchSyncController],
  providers: [SearchSyncService]
})
export class SearchSyncModule {}
