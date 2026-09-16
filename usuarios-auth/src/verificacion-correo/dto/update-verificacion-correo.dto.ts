import { PartialType } from '@nestjs/mapped-types';
import { CreateVerificacionCorreoDto } from './create-verificacion-correo.dto';

export class UpdateVerificacionCorreoDto extends PartialType(CreateVerificacionCorreoDto) {}
