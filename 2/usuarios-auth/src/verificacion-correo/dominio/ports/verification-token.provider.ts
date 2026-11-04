export interface VerificationTokenProvider {
  generar(): string;
  hash(token: string): string;
}
