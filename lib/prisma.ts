import { PrismaClient } from "@/app/generated/prisma/client";
import { createDbAdapter } from "@/lib/dbAdapter";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = createDbAdapter(process.env.DATABASE_URL ?? "file:./dev.db");

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
