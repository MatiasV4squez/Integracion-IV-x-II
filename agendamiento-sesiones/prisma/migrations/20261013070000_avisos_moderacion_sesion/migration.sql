CREATE TYPE "tipo_aviso_moderacion_enum" AS ENUM ('CONFLICTO_DETECTADO', 'CONFLICTO_RESUELTO');

CREATE TABLE "aviso_moderacion_sesion" (
    "id_aviso" BIGSERIAL NOT NULL,
    "id_sesion" BIGINT NOT NULL,
    "tipo" "tipo_aviso_moderacion_enum" NOT NULL,
    "contenido" JSONB NOT NULL,
    "fecha_creacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_entrega" TIMESTAMPTZ(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error" VARCHAR(500),
    CONSTRAINT "aviso_moderacion_sesion_pkey" PRIMARY KEY ("id_aviso"),
    CONSTRAINT "aviso_moderacion_sesion_intentos_check" CHECK ("intentos" >= 0),
    CONSTRAINT "aviso_moderacion_sesion_contenido_check" CHECK (jsonb_typeof("contenido") = 'object')
);

CREATE UNIQUE INDEX "aviso_moderacion_sesion_id_sesion_tipo_key"
ON "aviso_moderacion_sesion"("id_sesion", "tipo");

CREATE INDEX "aviso_moderacion_sesion_fecha_entrega_fecha_creacion_idx"
ON "aviso_moderacion_sesion"("fecha_entrega", "fecha_creacion");

ALTER TABLE "aviso_moderacion_sesion"
ADD CONSTRAINT "aviso_moderacion_sesion_id_sesion_fkey"
FOREIGN KEY ("id_sesion") REFERENCES "sesion"("id_sesion")
ON DELETE RESTRICT ON UPDATE CASCADE;
