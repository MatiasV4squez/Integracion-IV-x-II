import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  LIMITE_HISTORIAL, PAGINA_MAXIMA_HISTORIAL, ROLES_HISTORIAL,
  type EntradaHistorialPaginado, type RolHistorial,
} from '../../aplicacion/contratos/historial-paginado';
import { ESTADOS_SESION, type EstadoSesion } from '../../dominio/tipos/estado-sesion';

export class ConsultaHistorialDto implements EntradaHistorialPaginado {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: PAGINA_MAXIMA_HISTORIAL })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: LIMITE_HISTORIAL })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ enum: ROLES_HISTORIAL, description: 'Participación del usuario en la sesión. Sin filtro, incluye ambos roles.' })
  @IsOptional()
  @IsIn(ROLES_HISTORIAL)
  rol?: RolHistorial;

  @ApiPropertyOptional({ enum: ESTADOS_SESION })
  @IsOptional()
  @IsIn(ESTADOS_SESION)
  estado?: EstadoSesion;
}
