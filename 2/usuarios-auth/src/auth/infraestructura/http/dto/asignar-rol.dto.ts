import { IsIn, IsString } from 'class-validator';

export class AsignarRolDto {
  @IsString()
  idUsuario: string;

  @IsIn(['TUTOR'])
  rol: 'TUTOR';
}
