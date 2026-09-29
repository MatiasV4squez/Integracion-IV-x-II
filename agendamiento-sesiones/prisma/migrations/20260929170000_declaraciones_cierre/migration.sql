-- El registro de declaraciones pertenece exclusivamente al microservicio de sesiones.
CREATE TYPE "resultado_cierre_enum" AS ENUM ('COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA');

ALTER TABLE "sesion" ADD COLUMN "resultado_provisional" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "declaracion_cierre" (
    "id_declaracion" BIGSERIAL NOT NULL,
    "id_sesion" BIGINT NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "resultado_declarado" "resultado_cierre_enum" NOT NULL,
    "id_usuario_inasistente" BIGINT,
    "fecha_declaracion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "declaracion_cierre_pkey" PRIMARY KEY ("id_declaracion"),
    CONSTRAINT "declaracion_cierre_id_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "sesion"("id_sesion") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "declaracion_cierre_id_usuario_positivo" CHECK ("id_usuario" > 0),
    CONSTRAINT "declaracion_cierre_inasistencia_valida" CHECK (
      ("resultado_declarado" = 'INASISTENCIA' AND "id_usuario_inasistente" IS NOT NULL AND "id_usuario_inasistente" > 0)
      OR ("resultado_declarado" <> 'INASISTENCIA' AND "id_usuario_inasistente" IS NULL)
    )
);

CREATE UNIQUE INDEX "declaracion_cierre_id_sesion_id_usuario_key" ON "declaracion_cierre"("id_sesion", "id_usuario");
CREATE INDEX "declaracion_cierre_id_sesion_fecha_declaracion_idx" ON "declaracion_cierre"("id_sesion", "fecha_declaracion");
