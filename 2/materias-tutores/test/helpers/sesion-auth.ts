// Doble de Auth para pruebas de negocio que firman sus propios JWT.
export function crearSesionAuthMock() {
  return { validar: vi.fn().mockResolvedValue(undefined) };
}
