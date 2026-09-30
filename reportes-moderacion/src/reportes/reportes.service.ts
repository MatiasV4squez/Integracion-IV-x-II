import { Injectable } from '@nestjs/common';
import { CreateReporteDto } from './dto/create-reporte.dto.js';
import { UpdateReporteDto } from './dto/update-reporte.dto.js';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReportesService {
  // Instanciamos el cliente de la base de datos
  private prisma = new PrismaClient();

  // Convertimos la función a asíncrona (async)
  async create(createReporteDto: CreateReporteDto) {
    // Insertamos los datos. Prisma añadirá el estado "PENDIENTE" por defecto
    const nuevoReporte = await this.prisma.reporte.create({
      data: {
        titulo: createReporteDto.titulo,
        descripcion: createReporteDto.descripcion,
      },
    });

    return nuevoReporte;
  }

  findAll() {
    return `This action returns all reportes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reporte`;
  }

  update(id: number, updateReporteDto: UpdateReporteDto) {
    return `This action updates a #${id} reporte`;
  }

  remove(id: number) {
    return `This action removes a #${id} reporte`;
  }
}