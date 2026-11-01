import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { PostulacionesError } from '../../dominio/postulacion.js';

@Catch(PostulacionesError)
export class PostulacionesErrorFilter implements ExceptionFilter<PostulacionesError> {
  catch(error: PostulacionesError, host: ArgumentsHost): void {
    const statusCode = { ENTRADA_INVALIDA: 400, NO_ENCONTRADO: 404, CONFLICTO: 409, NO_DISPONIBLE: 503 }[error.codigo];
    const nombre = { ENTRADA_INVALIDA: 'Bad Request', NO_ENCONTRADO: 'Not Found', CONFLICTO: 'Conflict', NO_DISPONIBLE: 'Service Unavailable' }[error.codigo];
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message: error.message, error: nombre });
  }
}
