-- La cola conserva el evento si materias-tutores no está disponible.
CREATE TABLE "entrega_reputacion_tutor" (
    "id_calificacion" BIGINT NOT NULL,
    "fecha_creacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_entrega" TIMESTAMPTZ(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "entrega_reputacion_tutor_pkey" PRIMARY KEY ("id_calificacion"),
    CONSTRAINT "entrega_reputacion_tutor_id_calificacion_fkey" FOREIGN KEY ("id_calificacion") REFERENCES "calificacion"("id_calificacion") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "entrega_reputacion_tutor_intentos_no_negativos" CHECK ("intentos" >= 0)
);

CREATE INDEX "entrega_reputacion_tutor_fecha_entrega_fecha_creacion_idx" ON "entrega_reputacion_tutor"("fecha_entrega", "fecha_creacion");

-- Incluye notas previas recibidas como tutor al activar esta integración.
INSERT INTO "entrega_reputacion_tutor" ("id_calificacion")
SELECT c."id_calificacion"
FROM "calificacion" c
JOIN "sesion" s ON s."id_sesion" = c."id_sesion"
WHERE c."id_evaluado" = s."id_tutor";
