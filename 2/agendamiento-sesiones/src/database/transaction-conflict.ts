import { Prisma } from '../generated/prisma/client';

export function isTransactionConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034';
  }

  // Prisma 7 con adapter-pg puede propagar el error del COMMIT sin envolverlo en P2034.
  if (!(error instanceof Error) || error.name !== 'DriverAdapterError')
    return false;
  const cause = error.cause;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'originalCode' in cause &&
    (cause.originalCode === '40001' || cause.originalCode === '40P01')
  );
}
