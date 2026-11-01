import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { IntegracionBloqueError } from '../../dominio/estado-bloque.js';

@Catch(IntegracionBloqueError)
export class IntegracionBloqueErrorFilter implements ExceptionFilter<IntegracionBloqueError> {
  catch(error: IntegracionBloqueError, host: ArgumentsHost): void {
    const statusCode = error.codigo === 'NO_ENCONTRADO' ? 404 : 409;
    const nombre = statusCode === 404 ? 'Not Found' : 'Conflict';
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message: error.message, error: nombre });
  }
}
