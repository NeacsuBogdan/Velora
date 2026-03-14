import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const filePath = join(process.cwd(), "next-env.d.ts");

if (!existsSync(filePath)) {
  process.exit(0);
}

const current = readFileSync(filePath, "utf8");
const normalized = current.replace(
  "./.next/dev/types/routes.d.ts",
  "./.next/types/routes.d.ts",
);

if (normalized !== current) {
  writeFileSync(filePath, normalized, "utf8");
}
