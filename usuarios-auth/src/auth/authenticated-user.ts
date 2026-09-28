export interface AuthenticatedUser {
  sub: string;
  jti: string;
  correo_institucional: string;
  roles: string[];
}
