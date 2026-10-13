CREATE TABLE "liberacion_bloque_sesion" (
    "id_sesion" BIGINT NOT NULL,
    "id_bloque" BIGINT NOT NULL,
    "fecha_creacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_liberacion" TIMESTAMPTZ(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error" VARCHAR(500),
    CONSTRAINT "liberacion_bloque_sesion_pkey" PRIMARY KEY ("id_sesion"),
    CONSTRAINT "liberacion_bloque_sesion_intentos_check" CHECK ("intentos" >= 0)
);

CREATE INDEX "liberacion_bloque_sesion_fecha_liberacion_fecha_creacion_idx"
ON "liberacion_bloque_sesion"("fecha_liberacion", "fecha_creacion");

ALTER TABLE "liberacion_bloque_sesion"
ADD CONSTRAINT "liberacion_bloque_sesion_id_sesion_fkey"
FOREIGN KEY ("id_sesion") REFERENCES "sesion"("id_sesion")
ON DELETE RESTRICT ON UPDATE CASCADE;
