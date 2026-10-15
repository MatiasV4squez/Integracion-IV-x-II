import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { DisponibilidadError } from '../../dominio/bloque-horario.js';

@Catch(DisponibilidadError)
export class DisponibilidadErrorFilter implements ExceptionFilter<DisponibilidadError> {
  catch(error: DisponibilidadError, host: ArgumentsHost): void {
    const statusCode = { ENTRADA_INVALIDA: 400, NO_ENCONTRADO: 404, CONFLICTO: 409 }[error.codigo];
    const nombre = { ENTRADA_INVALIDA: 'Bad Request', NO_ENCONTRADO: 'Not Found', CONFLICTO: 'Conflict' }[error.codigo];
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message: error.message, error: nombre });
  }
}
