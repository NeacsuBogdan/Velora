import { Global, Module } from "@nestjs/common";

import { PlatformCacheService } from "./platform-cache.service";

@Global()
@Module({
  providers: [PlatformCacheService],
  exports: [PlatformCacheService]
})
export class PlatformCacheModule {}
