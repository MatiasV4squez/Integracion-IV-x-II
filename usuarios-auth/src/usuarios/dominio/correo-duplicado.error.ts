export class CorreoDuplicadoError extends Error {
  constructor() {
    super('El correo institucional ya está registrado.');
  }
}
