import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export function solicitudInvalida(message: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'REPORT_FILTER_INVALID',
    message,
  });
}

export function payloadInvalido(message: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'REPORT_PAYLOAD_INVALID',
    message,
  });
}

export function resolucionInvalida(message: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'REPORT_RESOLUTION_INVALID',
    message,
  });
}

export function reporteNoEncontrado(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'REPORT_NOT_FOUND',
    message: 'El reporte no existe.',
  });
}

export function reporteYaResuelto(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'REPORT_ALREADY_RESOLVED',
    message: 'El reporte ya fue resuelto.',
  });
}

export function reactivacionInvalida(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'REPORT_REACTIVATION_INVALID',
    message: 'Solo se puede reactivar un reporte suspendido sin reactivación previa.',
  });
}
