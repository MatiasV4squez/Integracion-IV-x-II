import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

const datosPublicosSelect = {
  id_usuario: true,
  nombre: true,
  correo_institucional: true,
  estado_cuenta: true,
  correo_verificado: true,
  roles: { select: { rol: { select: { nombre: true } } } },
} satisfies Prisma.UsuarioSelect;

type UsuarioPublico = Prisma.UsuarioGetPayload<{
  select: typeof datosPublicosSelect;
}>;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    return this.prisma.usuario.create({
      data: {
        nombre: createUsuarioDto.nombre,
        correo_institucional: createUsuarioDto.correo_institucional,
        password_hash: createUsuarioDto.password_hash,
        estado_cuenta: 'ACTIVO',
        correo_verificado: false,
      },
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany();
  }

  buscarPorCorreo(correo: string) {
    return this.prisma.usuario.findUnique({
      where: { correo_institucional: correo },
      select: { ...datosPublicosSelect, password_hash: true },
    });
  }

  datosPublicos(usuario: UsuarioPublico) {
    return {
      id_usuario: usuario.id_usuario.toString(),
      nombre: usuario.nombre,
      correo_institucional: usuario.correo_institucional,
      estado_cuenta: usuario.estado_cuenta,
      correo_verificado: usuario.correo_verificado,
      roles: usuario.roles.map(({ rol }) => rol.nombre),
    };
  }
}
