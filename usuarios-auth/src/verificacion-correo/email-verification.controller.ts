import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
} from '@nestjs/common';
import { createValidationPipe } from '../config/validation.pipe';
import { ConfirmarCorreoDto } from './dto/confirmar-correo.dto';
import { ReenviarVerificacionDto } from './dto/reenviar-verificacion.dto';
import { EmailVerificationService } from './email-verification.service';

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
    return this.emailVerification.reenviar(dto.correo_institucional);
  }

  @Post('verificar-correo')
  @HttpCode(HttpStatus.OK)
  confirmar(@Body() dto: ConfirmarCorreoDto) {
    return this.emailVerification.confirmar(dto.token);
  }
}
