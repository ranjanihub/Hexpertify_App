import dns from "dns";

if (typeof window === "undefined") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch {}
}

import { PrismaClient } from "@/generated/prisma";
// The one platform database, shared with the API (Backend/src/config/database.ts)
import { mongodbUri } from "@backend/config/database";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasourceUrl: mongodbUri });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
