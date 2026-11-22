CREATE TYPE "modalidad_encuentro_enum" AS ENUM ('PRESENCIAL', 'EN_LINEA');

ALTER TABLE "sesion"
    ADD COLUMN "modalidad" "modalidad_encuentro_enum",
    ADD COLUMN "lugar" VARCHAR(255),
    ADD COLUMN "enlace" VARCHAR(2048);
