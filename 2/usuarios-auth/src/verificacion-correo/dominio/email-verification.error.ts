export type EmailVerificationErrorCode =
  | 'EMAIL_DELIVERY_FAILED'
  | 'EMAIL_VERIFICATION_TOKEN_INVALID'
  | 'EMAIL_VERIFICATION_TOKEN_USED'
  | 'EMAIL_VERIFICATION_TOKEN_EXPIRED'
  | 'EMAIL_ALREADY_VERIFIED';

export class EmailVerificationError extends Error {
  constructor(
    readonly code: EmailVerificationErrorCode,
    message: string,
  ) {
    super(message);
  }
}
