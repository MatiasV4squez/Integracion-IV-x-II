CREATE TABLE "sesion" (
    "id_sesion" BIGSERIAL NOT NULL,
    "jti" VARCHAR(64) NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "fecha_expiracion" TIMESTAMP(6) NOT NULL,
    "ultima_actividad" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_revocacion" TIMESTAMP(6),

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id_sesion")
);

CREATE UNIQUE INDEX "sesion_jti_key" ON "sesion"("jti");
CREATE INDEX "sesion_id_usuario_fecha_expiracion_idx"
    ON "sesion"("id_usuario", "fecha_expiracion");

ALTER TABLE "sesion"
    ADD CONSTRAINT "sesion_id_usuario_fkey"
    FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario")
    ON DELETE RESTRICT ON UPDATE CASCADE;
