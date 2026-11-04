CREATE TABLE "postulacion_tutor" (
    "id_postulacion" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "id_materia" BIGINT NOT NULL,
    "id_administrador_revision" BIGINT,
    "certificado_ref" VARCHAR(500) NOT NULL,
    "certificado_nombre" VARCHAR(255) NOT NULL,
    "certificado_tipo" VARCHAR(30) NOT NULL,
    "nota_acreditada" DECIMAL(3,1),
    "estado" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "fecha_postulacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_revision" TIMESTAMP(3),
    "motivo_rechazo" VARCHAR(500),
    CONSTRAINT "postulacion_tutor_pkey" PRIMARY KEY ("id_postulacion")
);

CREATE INDEX "postulacion_tutor_estado_fecha_postulacion_idx" ON "postulacion_tutor"("estado", "fecha_postulacion");
CREATE INDEX "postulacion_tutor_id_usuario_id_materia_estado_idx" ON "postulacion_tutor"("id_usuario", "id_materia", "estado");
CREATE UNIQUE INDEX "postulacion_tutor_activa_por_materia_idx" ON "postulacion_tutor"("id_usuario", "id_materia") WHERE "estado" IN ('PENDIENTE', 'PENDIENTE_ROL', 'APROBADA');
ALTER TABLE "postulacion_tutor" ADD CONSTRAINT "postulacion_tutor_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "materia"("id_materia") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tutor_materia" (
    "id_tutor_materia" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "id_materia" BIGINT NOT NULL,
    "fecha_habilitacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "tutor_materia_pkey" PRIMARY KEY ("id_tutor_materia")
);
CREATE UNIQUE INDEX "tutor_materia_id_usuario_id_materia_key" ON "tutor_materia"("id_usuario", "id_materia");
ALTER TABLE "tutor_materia" ADD CONSTRAINT "tutor_materia_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "materia"("id_materia") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "perfil_tutor" (
    "id_usuario" BIGINT NOT NULL,
    "cantidad_calificaciones" INTEGER NOT NULL DEFAULT 0,
    "suma_calificaciones" INTEGER NOT NULL DEFAULT 0,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT "perfil_tutor_pkey" PRIMARY KEY ("id_usuario")
);

CREATE TABLE "calificacion_tutor_procesada" (
    "id_calificacion" BIGINT NOT NULL,
    "id_tutor" BIGINT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    CONSTRAINT "calificacion_tutor_procesada_pkey" PRIMARY KEY ("id_calificacion")
);
