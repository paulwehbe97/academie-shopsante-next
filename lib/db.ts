// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // logs utiles en dev ; en prod, garde "error" uniquement
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// évite de multiplier les clients en dev (HMR)
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
