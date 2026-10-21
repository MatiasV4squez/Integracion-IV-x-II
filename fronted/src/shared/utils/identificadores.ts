export function esIdentificador(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[1-9]\d{0,18}$/.test(valor)
    && BigInt(valor) <= 9223372036854775807n
}
