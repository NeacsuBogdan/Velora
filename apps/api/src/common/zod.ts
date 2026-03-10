import { BadRequestException } from "@nestjs/common";
import { ZodError, type ZodType } from "zod";

export function parseWithSchema<TOutput>(
  schema: ZodType<TOutput>,
  input: unknown
): TOutput {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException(error.flatten());
    }

    throw error;
  }
}
