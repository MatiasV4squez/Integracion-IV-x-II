BEGIN;
-- No existe conversión semántica automática de UUID a los BigInt del propietario.
-- No borrar datos: si hay registros, detener y preparar un mapeo acordado.
LOCK TABLE "sesion", "bloque_horario" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "sesion") OR EXISTS (SELECT 1 FROM "bloque_horario") THEN
    RAISE EXCEPTION 'Migración detenida: existen sesiones o bloques UUID. Se requiere un mapeo de identificadores y reservas con materias-tutores; no se borró ningún dato.';
  END IF;
END $$;

DROP TABLE "sesion";
DROP TABLE "bloque_horario";
DROP TYPE "bloque_horario_estado_bloque_enum";
CREATE TYPE "estado_reserva" AS ENUM ('PREPARADA', 'ASOCIADA', 'LIBERAR', 'LIBERADA');
CREATE TABLE "reserva_bloque" (
  "id" UUID NOT NULL,
  "id_bloque" BIGINT NOT NULL,
  "id_tutor" BIGINT NOT NULL,
  "id_materia" BIGINT NOT NULL,
  "estado" "estado_reserva" NOT NULL DEFAULT 'PREPARADA',
  "fecha_creacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "proximo_intento" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "intentos" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "reserva_bloque_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "sesion" (
  "id_sesion" BIGSERIAL NOT NULL,
  "id_tutee" BIGINT NOT NULL,
  "id_tutor" BIGINT NOT NULL,
  "id_materia" BIGINT NOT NULL,
  "id_bloque" BIGINT NOT NULL,
  "estado_sesion" "sesion_estado_sesion_enum" NOT NULL DEFAULT 'PENDIENTE',
  "inicio" TIMESTAMPTZ(3) NOT NULL,
  "fin" TIMESTAMPTZ(3) NOT NULL,
  "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "id_reserva" UUID NOT NULL,
  CONSTRAINT "sesion_pkey" PRIMARY KEY ("id_sesion"),
  CONSTRAINT "sesion_horario_valido" CHECK ("fin" > "inicio"),
  CONSTRAINT "sesion_ids_positivos" CHECK ("id_tutee" > 0 AND "id_tutor" > 0 AND "id_materia" > 0 AND "id_bloque" > 0),
  CONSTRAINT "sesion_id_reserva_fkey" FOREIGN KEY ("id_reserva") REFERENCES "reserva_bloque"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sesion_id_reserva_key" ON "sesion"("id_reserva");
CREATE INDEX "sesion_id_tutee_estado_sesion_idx" ON "sesion"("id_tutee", "estado_sesion");
CREATE INDEX "sesion_id_tutor_inicio_fin_idx" ON "sesion"("id_tutor", "inicio", "fin");
CREATE INDEX "sesion_estado_sesion_fecha_creacion_idx" ON "sesion"("estado_sesion", "fecha_creacion");
CREATE INDEX "reserva_bloque_estado_proximo_intento_idx" ON "reserva_bloque"("estado", "proximo_intento");
COMMIT;
