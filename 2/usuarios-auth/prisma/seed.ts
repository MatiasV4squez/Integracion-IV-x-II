import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el sembrado (seeding) de la base de datos...');

  // Nombres de los roles básicos para el Sistema de Tutorías entre Pares
  const roles = ['ESTUDIANTE', 'TUTOR', 'ADMINISTRADOR'];

  for (const nombreRol of roles) {
    const existe = await prisma.rol.findFirst({
      where: { nombre: nombreRol }
    });

    if (!existe) {
      await prisma.rol.create({
        data: { nombre: nombreRol }
      });
      console.log(`Rol creado: ${nombreRol}`);
    } else {
      console.log(`El rol ${nombreRol} ya existe. Omitiendo...`);
    }
  }

  console.log('¡Sembrado completado con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });