import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  HttpException,
  Post,
  UsePipes,
} from '@nestjs/common';
import { createValidationPipe } from '../../../config/validation.pipe';
import { ConfirmarCorreoDto } from './dto/confirmar-correo.dto';
import { ReenviarVerificacionDto } from './dto/reenviar-verificacion.dto';
import { EmailVerificationService } from '../../aplicacion/email-verification.service';
import { EmailVerificationError } from '../../dominio/email-verification.error';

const ERROR_STATUS = {
  EMAIL_DELIVERY_FAILED: HttpStatus.SERVICE_UNAVAILABLE,
  EMAIL_VERIFICATION_TOKEN_INVALID: HttpStatus.BAD_REQUEST,
  EMAIL_VERIFICATION_TOKEN_USED: HttpStatus.CONFLICT,
  EMAIL_VERIFICATION_TOKEN_EXPIRED: HttpStatus.GONE,
  EMAIL_ALREADY_VERIFIED: HttpStatus.CONFLICT,
};

@Controller('auth')
@UsePipes(
  createValidationPipe({
    code: 'EMAIL_VERIFICATION_INVALID_REQUEST',
    message: 'Los datos de verificación no son válidos.',
  }),
)
export class EmailVerificationController {
  constructor(private readonly emailVerification: EmailVerificationService) {}

  @Post('reenviar-verificacion')
  @HttpCode(HttpStatus.ACCEPTED)
  reenviar(@Body() dto: ReenviarVerificacionDto) {
    return this.responder(
      this.emailVerification.reenviar(dto.correo_institucional),
    );
  }

  @Post('verificar-correo')
  @HttpCode(HttpStatus.OK)
  confirmar(@Body() dto: ConfirmarCorreoDto) {
    return this.responder(this.emailVerification.confirmar(dto.token));
  }

  private async responder<T>(operacion: Promise<T>): Promise<T> {
    try {
      return await operacion;
    } catch (error) {
      if (!(error instanceof EmailVerificationError)) throw error;
      const statusCode = ERROR_STATUS[error.code];
      throw new HttpException(
        { statusCode, code: error.code, message: error.message },
        statusCode,
      );
    }
  }
}
