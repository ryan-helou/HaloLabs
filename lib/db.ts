import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Cap the connection pool per app instance so a traffic spike can't exhaust
// Railway Postgres's connection limit (which starts erroring every query once
// hit). `max` bounds concurrent connections; `connectionTimeoutMillis` makes a
// request WAIT for a free connection instead of throwing when the pool is busy;
// idle connections are released after 30s. Size DATABASE_POOL_MAX so
// (instances × max) stays under the database's max_connections.
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX) || 10

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: POOL_MAX,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
