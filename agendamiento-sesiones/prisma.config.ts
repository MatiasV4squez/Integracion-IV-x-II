import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { getDatabaseUrl } from './src/database/database.config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Generar el cliente no requiere credenciales ni conexión a PostgreSQL.
    url:
      process.env.DATABASE_URL || process.env.DB_PASSWORD
        ? getDatabaseUrl(process.env)
        : undefined,
  },
});
