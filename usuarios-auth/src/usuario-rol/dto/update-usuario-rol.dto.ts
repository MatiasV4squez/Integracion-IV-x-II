import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioRoleDto } from './create-usuario-rol.dto';

export class UpdateUsuarioRolDto extends PartialType(CreateUsuarioRoleDto) {}
