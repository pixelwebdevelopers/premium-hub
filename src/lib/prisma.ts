import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const purgePrismaCache = () => {
  if (typeof require !== 'undefined' && require.cache) {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('@prisma/client') || key.includes('.prisma/client')) {
        delete require.cache[key];
      }
    });
  }
};

const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'premium_hub',
    connectionLimit: 10,
  });
  
  // eslint-disable-next-line
  const FreshPrismaClient = typeof require !== 'undefined'
    ? require('@prisma/client').PrismaClient
    : PrismaClient;

  return new FreshPrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

let prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Self-healing: Recreate client if schema was updated but standard hot reload is using older global cached client
if (prisma && (!('paymentMethod' in prisma) || !('chatSession' in prisma))) {
  purgePrismaCache();
  prisma = prismaClientSingleton();
}

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

