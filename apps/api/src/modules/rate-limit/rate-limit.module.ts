import { Global, Module } from "@nestjs/common";

import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { RateLimitService } from "./rate-limit.service";

@Global()
@Module({
  providers: [RateLimitService, RateLimitGuard],
  exports: [RateLimitService, RateLimitGuard]
})
export class RateLimitModule {}
