export interface PasswordHasher {
  generarHash(password: string): Promise<string>;
}
