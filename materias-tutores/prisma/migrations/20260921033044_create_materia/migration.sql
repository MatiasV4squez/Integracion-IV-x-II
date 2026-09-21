-- CreateTable
CREATE TABLE "materia" (
    "id_materia" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,

    CONSTRAINT "materia_pkey" PRIMARY KEY ("id_materia")
);

-- CreateIndex
CREATE UNIQUE INDEX "materia_codigo_key" ON "materia"("codigo");
