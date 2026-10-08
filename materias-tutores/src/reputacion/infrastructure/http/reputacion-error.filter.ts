import { ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { ReputacionError } from '../../domain/reputacion.js';

@Catch(ReputacionError)
export class ReputacionErrorFilter implements ExceptionFilter<ReputacionError> {
  catch(error: ReputacionError, host: ArgumentsHost): void {
    const status = { ENTRADA_INVALIDA: 400, TUTOR_NO_ENCONTRADO: 404, CONFLICTO: 409 }[error.codigo];
    host.switchToHttp().getResponse<Response>().status(status).json({ statusCode: status, message: error.message });
  }
}
