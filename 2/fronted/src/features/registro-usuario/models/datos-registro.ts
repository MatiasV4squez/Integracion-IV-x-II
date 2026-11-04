export interface DatosRegistroUsuario {
  nombre: string
  correo: string
  contrasena: string
}

export interface FormularioRegistroUsuario extends DatosRegistroUsuario {
  confirmacion: string
}
