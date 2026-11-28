CREATE TABLE "notificacion" (
    "id" SERIAL NOT NULL,
    "usuarioId" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notificacion_usuarioId_creadoEn_id_idx"
ON "notificacion"("usuarioId", "creadoEn", "id");
