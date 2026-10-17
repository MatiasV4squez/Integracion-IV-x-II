CREATE TYPE "disponibilidad_estado_enum" AS ENUM ('DISPONIBLE', 'RESERVADO', 'NO_DISPONIBLE');

CREATE TABLE "disponibilidad_tutor" (
    "id_disponibilidad" BIGSERIAL NOT NULL,
    "id_tutor" BIGINT NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3) NOT NULL,
    "estado" "disponibilidad_estado_enum" NOT NULL DEFAULT 'DISPONIBLE',
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    "fecha_actualizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT "disponibilidad_tutor_pkey" PRIMARY KEY ("id_disponibilidad")
);

CREATE INDEX "disponibilidad_tutor_id_tutor_estado_idx"
ON "disponibilidad_tutor"("id_tutor", "estado");

CREATE INDEX "disponibilidad_tutor_id_tutor_inicio_idx"
ON "disponibilidad_tutor"("id_tutor", "inicio");
