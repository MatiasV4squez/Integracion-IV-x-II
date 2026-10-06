import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { hash } from 'argon2';

const datosPublicosSelect = {
  id_usuario: true,
  nombre: true,
  correo_institucional: true,
  estado_cuenta: true,
  correo_verificado: true,
  carrera: true,
  semestre_actual: true,
  biografia: true,
  roles: { select: { rol: { select: { nombre: true } } } },
} satisfies Prisma.UsuarioSelect;

type UsuarioPublico = Prisma.UsuarioGetPayload<{
  select: typeof datosPublicosSelect;
}>;

@Injectable()
export class UsuariosService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.rol.upsert({
      where: { id_rol: 1 },
      update: {},
      create: { id_rol: 1, nombre: 'ESTUDIANTE' },
    });
    console.log('Rol ESTUDIANTE verificado/creado en la base de datos');
  }
  
  async create(createUsuarioDto: CreateUsuarioDto) {
    const hashedPassword = await hash(createUsuarioDto.password_hash);

    return this.prisma.usuario.create({
      data: {
        nombre: createUsuarioDto.nombre,
        correo_institucional: createUsuarioDto.correo_institucional,
        password_hash: hashedPassword,
        estado_cuenta: 'ACTIVO',
        correo_verificado: false,
        roles: {
          create:{
            rol: {
              connect: {id_rol: 1},
            }
          }
        }
      },
      select: datosPublicosSelect
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany();
  }

  
  async actualizarPerfil(id_string: string, updatePerfilDto: UpdatePerfilDto) {
    const id = BigInt(id_string); // Convertimos el string de la URL a BigInt
    
    return this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        carrera: updatePerfilDto.carrera,
        semestre_actual: updatePerfilDto.semestre_actual,
        biografia: updatePerfilDto.biografia,
      },
      select: datosPublicosSelect 
    });
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
