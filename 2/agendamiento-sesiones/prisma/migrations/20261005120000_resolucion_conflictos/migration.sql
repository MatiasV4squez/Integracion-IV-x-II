-- La resolución y la sesión se guardan en la misma transacción.
CREATE TABLE "resolucion_conflicto_sesion" (
    "id_resolucion" BIGSERIAL NOT NULL,
    "id_sesion" BIGINT NOT NULL,
    "id_administrador" BIGINT NOT NULL,
    "estado_final" "resultado_cierre_enum" NOT NULL,
    "motivo_resolucion" VARCHAR(500) NOT NULL,
    "observaciones" TEXT,
    "fecha_resolucion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resolucion_conflicto_sesion_pkey" PRIMARY KEY ("id_resolucion"),
    CONSTRAINT "resolucion_conflicto_sesion_id_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "sesion"("id_sesion") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "resolucion_conflicto_sesion_id_administrador_positivo" CHECK ("id_administrador" > 0),
    CONSTRAINT "resolucion_conflicto_sesion_motivo_no_vacio" CHECK (length(btrim("motivo_resolucion")) > 0)
);

CREATE UNIQUE INDEX "resolucion_conflicto_sesion_id_sesion_key" ON "resolucion_conflicto_sesion"("id_sesion");
