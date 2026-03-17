import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const target = process.argv[2];

if (!target) {
  console.error("Usage: node clean-directory.mjs <path>");
  process.exit(1);
}

const resolvedTarget = resolve(process.cwd(), target);

if (existsSync(resolvedTarget)) {
  rmSync(resolvedTarget, { force: true, recursive: true });
}
