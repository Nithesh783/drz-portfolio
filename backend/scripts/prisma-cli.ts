import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../.env") });

const result = spawnSync("prisma", process.argv.slice(2), {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
