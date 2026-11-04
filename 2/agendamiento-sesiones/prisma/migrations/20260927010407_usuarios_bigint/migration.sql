/*
  Warnings:

  - Changed the type of `id_tutor` on the `bloque_horario` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_tutee` on the `sesion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_tutor` on the `sesion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "bloque_horario" DROP COLUMN "id_tutor",
ADD COLUMN     "id_tutor" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "sesion" DROP COLUMN "id_tutee",
ADD COLUMN     "id_tutee" BIGINT NOT NULL,
DROP COLUMN "id_tutor",
ADD COLUMN     "id_tutor" BIGINT NOT NULL;
