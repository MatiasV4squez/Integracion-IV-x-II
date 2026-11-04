import { ArgumentsHost, BadRequestException, Catch, ConflictException, ExceptionFilter, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import { ErrorSesion } from '../../dominio/errores/error-sesion';

@Catch(ErrorSesion)
export class ErrorSesionFilter implements ExceptionFilter<ErrorSesion> {
  catch(error: ErrorSesion, contexto: ArgumentsHost): void {
    const excepciones = {
      ENTRADA_INVALIDA: BadRequestException,
      CONFLICTO: ConflictException,
      PROHIBIDO: ForbiddenException,
      NO_ENCONTRADA: NotFoundException,
      DEPENDENCIA_NO_DISPONIBLE: ServiceUnavailableException,
    };
    const excepcion = new excepciones[error.motivo](error.message);
    contexto
      .switchToHttp()
      .getResponse<Response>()
      .status(excepcion.getStatus())
      .json(excepcion.getResponse());
  }
}
