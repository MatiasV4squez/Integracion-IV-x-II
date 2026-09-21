import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

function mensajesDeValidacion(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...mensajesDeValidacion(error.children ?? []),
  ]);
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      new BadRequestException({
        statusCode: 400,
        code: 'AUTH_INVALID_REQUEST',
        message: 'Los datos de autenticación no son válidos.',
        details: mensajesDeValidacion(errors),
      }),
  });
}
