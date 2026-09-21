import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const materiasIniciales = [
  { codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' },
  { codigo: 'INFO1157', nombre: 'SISTEMAS INTELIGENTES' },
  { codigo: 'INFO1126', nombre: 'PROGRAMACIÓN III' },
];

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL es obligatoria para ejecutar la semilla.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  }),
});

async function main() {
  for (const materia of materiasIniciales) {
    await prisma.materia.upsert({
      where: {
        codigo: materia.codigo,
      },
      update: {
        nombre: materia.nombre,
      },
      create: {
        codigo: materia.codigo,
        nombre: materia.nombre,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })

  .finally(async () => {
    await prisma.$disconnect();
  });
