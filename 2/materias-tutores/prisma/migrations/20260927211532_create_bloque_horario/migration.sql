-- CreateTable
CREATE TABLE "bloque_horario" (
    "id_bloque" BIGSERIAL NOT NULL,
    "id_tutor" BIGINT NOT NULL,
    "dia" DATE NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fin" TIME(0) NOT NULL,
    "estado_bloque" VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',

    CONSTRAINT "bloque_horario_pkey" PRIMARY KEY ("id_bloque")
);

-- CreateIndex
CREATE INDEX "bloque_horario_id_tutor_dia_idx" ON "bloque_horario"("id_tutor", "dia");
