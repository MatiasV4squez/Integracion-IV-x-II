import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from './prisma.service';
import { isTransactionConflict } from './transaction-conflict';

export async function runSerializable<T>(
  prisma: PrismaService,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: unknown) {
      if (!isTransactionConflict(error)) throw error;
      if (attempt < 3)
        await new Promise<void>((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
  throw new ConflictException(
    'Otra operación modificó los datos. Intenta nuevamente.',
  );
}
