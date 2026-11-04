CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "bloque_horario_estado_bloque_enum" AS ENUM ('DISPONIBLE', 'RESERVADO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "sesion_estado_sesion_enum" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'EXPIRADA', 'CANCELADA', 'PENDIENTE_CIERRE', 'COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA', 'EN_CONFLICTO');

-- CreateTable
CREATE TABLE "bloque_horario" (
    "id_bloque" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "id_tutor" UUID NOT NULL,
    "dia" DATE NOT NULL,
    "hora_inicio" TIME(6) NOT NULL,
    "hora_fin" TIME(6) NOT NULL,
    "estado_bloque" "bloque_horario_estado_bloque_enum" NOT NULL DEFAULT 'DISPONIBLE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_ec6dc32412ccf07cd8b85847d56" PRIMARY KEY ("id_bloque")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id_sesion" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "id_tutee" UUID NOT NULL,
    "id_tutor" UUID NOT NULL,
    "id_materia" UUID NOT NULL,
    "id_bloque" UUID NOT NULL,
    "estado_sesion" "sesion_estado_sesion_enum" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_25f520935e8570102c469357dfc" PRIMARY KEY ("id_sesion")
);

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "FK_b03e711cb8b8859b9579a67dd58" FOREIGN KEY ("id_bloque") REFERENCES "bloque_horario"("id_bloque") ON DELETE RESTRICT ON UPDATE NO ACTION;
