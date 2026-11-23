import { PrismaPg } from "@prisma/adapter-pg";

export function createPrismaAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured before connecting to PostgreSQL.");
  }

  return new PrismaPg({ connectionString });
}
