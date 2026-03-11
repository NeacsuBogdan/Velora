import type { SessionResponse } from "@velora/contracts";
import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  auth?: SessionResponse;
  rawBody?: Buffer;
}
