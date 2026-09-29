import { PartialType } from '@nestjs/mapped-types';
import { CreateReporteDto } from './create-reporte.dto.js';

export class UpdateReporteDto extends PartialType(CreateReporteDto) {}
