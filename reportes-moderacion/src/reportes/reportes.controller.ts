import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReportesService } from './reportes.service.js';
import { CreateReporteDto } from './dto/create-reporte.dto.js';
import { UpdateReporteDto } from './dto/update-reporte.dto.js';
import { ValidarSesionParaReporteGuard } from './guards/validar-sesion-para-reporte.guard.js';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post()
  @UseGuards(ValidarSesionParaReporteGuard)
  create(@Body() createReporteDto: CreateReporteDto) {
    return this.reportesService.create(createReporteDto);
  }

  @Get()
  findAll() {
    return this.reportesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReporteDto: UpdateReporteDto) {
    return this.reportesService.update(+id, updateReporteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportesService.remove(+id);
  }
}
