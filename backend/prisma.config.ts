import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";
import { resolve } from "node:path";

const backendRoot = process.cwd();

config({ path: resolve(backendRoot, "../.env") });

export default defineConfig({
  schema: resolve(backendRoot, "prisma/schema.prisma"),
  migrations: {
    path: resolve(backendRoot, "prisma/migrations"),
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
