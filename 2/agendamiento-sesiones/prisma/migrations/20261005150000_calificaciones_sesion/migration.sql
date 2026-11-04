-- Cada participante puede calificar una sola vez una sesión completada.
CREATE TABLE "calificacion" (
    "id_calificacion" BIGSERIAL NOT NULL,
    "id_sesion" BIGINT NOT NULL,
    "id_evaluador" BIGINT NOT NULL,
    "id_evaluado" BIGINT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "fecha_calificacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calificacion_pkey" PRIMARY KEY ("id_calificacion"),
    CONSTRAINT "calificacion_id_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "sesion"("id_sesion") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "calificacion_evaluador_positivo" CHECK ("id_evaluador" > 0),
    CONSTRAINT "calificacion_evaluado_positivo" CHECK ("id_evaluado" > 0),
    CONSTRAINT "calificacion_partes_distintas" CHECK ("id_evaluador" <> "id_evaluado"),
    CONSTRAINT "calificacion_puntuacion_valida" CHECK ("puntuacion" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX "calificacion_id_sesion_id_evaluador_key" ON "calificacion"("id_sesion", "id_evaluador");
CREATE INDEX "calificacion_id_evaluado_idx" ON "calificacion"("id_evaluado");
