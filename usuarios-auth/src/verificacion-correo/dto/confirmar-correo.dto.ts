import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class ConfirmarCorreoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(64, 64)
  token: string;
}
