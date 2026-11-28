import {BadRequestException, Controller, DefaultValuePipe, Get, Inject, ParseIntPipe, Query, Req, UseGuards} from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma.service.js';
import {UsuarioJwtGuard, usuarioActual, type RequestConUsuario} from './guards/usuario-jwt.guard.js';

@Controller('notificaciones')
@UseGuards(UsuarioJwtGuard)
export class NotificacionesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async listar(
    @Req() request: RequestConUsuario,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite: number,
  ) {
    if (limite < 1 || limite > 100) {
      throw new BadRequestException('limite debe estar entre 1 y 100.');
    }
    const desplazamiento = (pagina - 1) * limite;
    if (pagina < 1 || desplazamiento > 2_147_483_647) {
      throw new BadRequestException('pagina está fuera del rango permitido.');
    }

    const usuarioId = BigInt(usuarioActual(request).sub);
    const filtro = { usuarioId };
    const [datos, total] = await this.prisma.$transaction(
      [
        this.prisma.notificacion.findMany({
          where: filtro,
          orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
          skip: desplazamiento,
          take: limite,
          select: { id: true, tipo: true, mensaje: true, creadoEn: true },
        }),
        this.prisma.notificacion.count({ where: filtro }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );

    return {datos, paginacion: { pagina, limite, total, total_paginas: Math.ceil(total / limite) },
    };
  }
}
