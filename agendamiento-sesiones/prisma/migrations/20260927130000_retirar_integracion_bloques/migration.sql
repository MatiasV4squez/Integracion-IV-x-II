BEGIN;
LOCK TABLE "sesion", "reserva_bloque" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "reserva_bloque") THEN
    RAISE EXCEPTION 'Retiro detenido: hay registros de reservas; deben revisarse antes de retirar la integración. No se borró ningún dato.';
  END IF;
END $$;
ALTER TABLE "sesion" DROP CONSTRAINT "sesion_id_reserva_fkey";
DROP INDEX "sesion_id_reserva_key";
ALTER TABLE "sesion" DROP COLUMN "id_reserva";
DROP TABLE "reserva_bloque";
DROP TYPE "estado_reserva";
COMMIT;
