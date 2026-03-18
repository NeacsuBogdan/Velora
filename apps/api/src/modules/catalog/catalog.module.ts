import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { SearchModule } from "../search/search.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [DatabaseModule, SearchModule],
  controllers: [CatalogController],
  providers: [CatalogService]
})
export class CatalogModule {}
