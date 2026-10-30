const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;
const ID_ENTIDAD_PATTERN = /^[1-9]\d{0,18}$/;

export function idEntidadValido(value: string): boolean {
  return ID_ENTIDAD_PATTERN.test(value) && BigInt(value) <= MAX_POSTGRES_BIGINT;
}

export function normalizarIdEntidad(value: unknown): string | undefined {
  if (typeof value === 'string' && ID_ENTIDAD_PATTERN.test(value)) {
    return BigInt(value) <= MAX_POSTGRES_BIGINT ? value : undefined;
  }
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  return undefined;
}

export function parsearIdEntidad(value: unknown): bigint | undefined {
  const normalizado = normalizarIdEntidad(value);
  return normalizado === undefined ? undefined : BigInt(normalizado);
}
