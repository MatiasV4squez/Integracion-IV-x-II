CREATE TABLE "usuario" (
    "id_usuario" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "correo_institucional" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "carrera" VARCHAR(150),
    "semestre_actual" INTEGER,
    "biografia" TEXT,
    "estado_cuenta" VARCHAR(30) NOT NULL,
    "correo_verificado" BOOLEAN NOT NULL,
    "fecha_registro" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);
CREATE TABLE "rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);
CREATE TABLE "usuario_rol" (
    "id_usuario" BIGINT NOT NULL,
    "id_rol" INTEGER NOT NULL,
    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id_usuario", "id_rol")
);
CREATE TABLE "verificacion_correo" (
    "id_verificacion" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "fecha_expiracion" TIMESTAMP(6) NOT NULL,
    "fecha_utilizacion" TIMESTAMP(6),
    CONSTRAINT "verificacion_correo_pkey" PRIMARY KEY ("id_verificacion")
);
CREATE UNIQUE INDEX "usuario_correo_institucional_key" ON "usuario"("correo_institucional");
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");
CREATE UNIQUE INDEX "verificacion_correo_token_key" ON "verificacion_correo"("token");
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "verificacion_correo" ADD CONSTRAINT "verificacion_correo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
