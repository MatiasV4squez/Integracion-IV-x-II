import { Prisma } from '../generated/prisma/client';
import { isTransactionConflict } from './transaction-conflict';

describe('Conflictos reintentables de transacciones', () => {
  it('reconoce P2034', () => {
    expect(
      isTransactionConflict(
        new Prisma.PrismaClientKnownRequestError('conflict', {
          code: 'P2034',
          clientVersion: '7',
        }),
      ),
    ).toBe(true);
  });

  it.each(['40001', '40P01'])(
    'reconoce SQLSTATE %s del COMMIT del adaptador',
    (code) => {
      const error = new Error('TransactionWriteConflict', {
        cause: { originalCode: code },
      });
      error.name = 'DriverAdapterError';
      expect(isTransactionConflict(error)).toBe(true);
    },
  );

  it.each([
    null,
    undefined,
    new Error('otro'),
    { code: 'P2034' },
    new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '7',
    }),
  ])('no reintenta otros errores: %s', (error) => {
    expect(isTransactionConflict(error)).toBe(false);
  });

  it('no reintenta violaciones de integridad del adaptador', () => {
    const error = new Error('constraint', { cause: { originalCode: '23514' } });
    error.name = 'DriverAdapterError';
    expect(isTransactionConflict(error)).toBe(false);
  });
});
