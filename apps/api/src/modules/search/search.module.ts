import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { SearchController } from "./search.controller";
import { OpenSearchService } from "./opensearch.service";
import { SearchProjectionService, SearchService } from "./search.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SearchController],
  providers: [OpenSearchService, SearchProjectionService, SearchService],
  exports: [SearchProjectionService]
})
export class SearchModule {}
