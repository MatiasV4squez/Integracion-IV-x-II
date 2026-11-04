-- CreateTable
CREATE TABLE "Reporte" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "idSesion" BIGINT NOT NULL,
    "usuarioReportadorId" BIGINT NOT NULL,
    "usuarioReportadoId" BIGINT NOT NULL,
    "motivo" TEXT,
    "resueltoPorId" BIGINT,
    "resueltoEn" TIMESTAMP(3),
    "reactivadoPorId" BIGINT,
    "reactivadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aviso_sesion" (
    "id" SERIAL NOT NULL,
    "origen" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "idAviso" TEXT NOT NULL,
    "fechaAviso" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "idSesion" BIGINT NOT NULL,
    "datos" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aviso_sesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aviso_sesion_idAviso_key" ON "aviso_sesion"("idAviso");

-- CreateIndex
CREATE INDEX "aviso_sesion_tipo_idSesion_idx" ON "aviso_sesion"("tipo", "idSesion");

