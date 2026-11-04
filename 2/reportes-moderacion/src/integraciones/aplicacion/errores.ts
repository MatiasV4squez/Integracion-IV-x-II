import { BadRequestException } from '@nestjs/common';

export function avisoInvalido(message: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'AVISO_PAYLOAD_INVALID',
    message,
  });
}
