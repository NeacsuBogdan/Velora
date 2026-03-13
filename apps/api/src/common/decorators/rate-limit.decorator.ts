import { SetMetadata } from "@nestjs/common";

import type { RateLimitPreset } from "../../modules/rate-limit/rate-limit.types";

export const RATE_LIMIT_METADATA_KEY = "rate_limit_preset";

export function RateLimit(preset: RateLimitPreset) {
  return SetMetadata(RATE_LIMIT_METADATA_KEY, preset);
}
