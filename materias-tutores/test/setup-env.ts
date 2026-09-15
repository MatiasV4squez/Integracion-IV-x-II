// Solo se usa en pruebas con Prisma sustituido: no abre conexiones reales.
process.env.DATABASE_URL =
  'postgresql://test:test@localhost:5432/materias_test';
process.env.PORT = '3000';
