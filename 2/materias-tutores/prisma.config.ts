import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Generar el cliente no necesita una base de datos ni credenciales.
  datasource: { url: process.env.DATABASE_URL },
});
