import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type PostulacionTutor } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { type ArchivoCertificado, validarCertificado } from './postulaciones.dto.js';

@Injectable()
export class PostulacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private mapearPostulacion(postulacion: PostulacionTutor) {
    return {
      idPostulacion: postulacion.idPostulacion.toString(),
      idUsuario: postulacion.idUsuario.toString(),
      idMateria: postulacion.idMateria.toString(),
      idAdministradorRevision:
        postulacion.idAdministradorRevision?.toString() ?? null,
      certificadoNombre: postulacion.certificadoNombre,
      certificadoTipo: postulacion.certificadoTipo,
      notaAcreditada: postulacion.notaAcreditada?.toNumber() ?? null,
      estado: postulacion.estado,
      fechaPostulacion: postulacion.fechaPostulacion,
      fechaRevision: postulacion.fechaRevision,
      motivoRechazo: postulacion.motivoRechazo,
    };
  }

  private directorioCertificados(): string {
    return resolve(
      this.config.get<string>('CERTIFICADOS_DIR') ?? './certificados',
    );
  }

  async postular(
    idUsuario: bigint,
    idMateria: bigint,
    archivo: ArchivoCertificado,
  ) {
    const tipo = validarCertificado(archivo);
    const materia = await this.prisma.materia.findUnique({
      where: { idMateria },
    });
    if (!materia) throw new NotFoundException('Materia no encontrada');

    const existente = await this.prisma.postulacionTutor.findFirst({
      where: {
        idUsuario,
        idMateria,
        estado: { in: ['PENDIENTE', 'PENDIENTE_ROL', 'APROBADA'] },
      },
    });
    if (existente)
      throw new ConflictException(
        'Ya existe una postulación activa para esta materia',
      );

    const extension = tipo === 'application/pdf' ? 'pdf' : 'png';
    const referencia = `${createHash('sha256').update(archivo.buffer).digest('hex')}.${extension}`;
    await mkdir(this.directorioCertificados(), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(
      join(this.directorioCertificados(), referencia),
      archivo.buffer,
      { flag: 'wx', mode: 0o600 },
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
    });

    try {
      const postulacion = await this.prisma.postulacionTutor.create({
        data: {
          idUsuario,
          idMateria,
          certificadoRef: referencia,
          certificadoNombre: archivo.originalname,
          certificadoTipo: tipo,
        },
      });
      return this.mapearPostulacion(postulacion);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una postulación activa para esta materia',
        );
      }
      throw error;
    }
  }

  async listarPendientes() {
    const postulaciones = await this.prisma.postulacionTutor.findMany({
      where: { estado: { in: ['PENDIENTE', 'PENDIENTE_ROL'] } },
      orderBy: [{ fechaPostulacion: 'asc' }, { idPostulacion: 'asc' }],
    });
    return postulaciones.map((postulacion) =>
      this.mapearPostulacion(postulacion),
    );
  }

  async consultarPropias(idUsuario: bigint) {
    const postulaciones = await this.prisma.postulacionTutor.findMany({
      where: { idUsuario },
      orderBy: { fechaPostulacion: 'desc' },
    });
    return postulaciones.map((postulacion) =>
      this.mapearPostulacion(postulacion),
    );
  }

  async obtenerCertificado(
    idPostulacion: bigint,
    idUsuario: bigint | null,
  ): Promise<{ contenido: Buffer; tipo: string; nombre: string }> {
    const postulacion = await this.prisma.postulacionTutor.findUnique({
      where: { idPostulacion },
    });
    if (
      !postulacion ||
      (idUsuario !== null && postulacion.idUsuario !== idUsuario)
    )
      throw new NotFoundException('Postulación no encontrada');
    const contenido = await readFile(
      join(this.directorioCertificados(), postulacion.certificadoRef),
    ).catch(() => {
      throw new NotFoundException('Certificado no disponible');
    });
    return {
      contenido,
      tipo: postulacion.certificadoTipo,
      nombre: postulacion.certificadoNombre,
    };
  }

  async rechazar(
    idPostulacion: bigint,
    idAdministrador: bigint,
    motivoRechazo: string,
  ) {
    const resultado = await this.prisma.postulacionTutor.updateMany({
      where: { idPostulacion, estado: 'PENDIENTE' },
      data: {
        estado: 'RECHAZADA',
        idAdministradorRevision: idAdministrador,
        fechaRevision: new Date(),
        motivoRechazo,
      },
    });
    if (resultado.count !== 1)
      throw new ConflictException('La postulación no está pendiente');
    const postulacion = await this.prisma.postulacionTutor.findUniqueOrThrow({
      where: { idPostulacion },
    });
    return this.mapearPostulacion(postulacion);
  }

  async aprobar(
    idPostulacion: bigint,
    idAdministrador: bigint,
    notaAcreditada: number,
  ) {
    if (
      !Number.isFinite(notaAcreditada) ||
      notaAcreditada < 5 ||
      notaAcreditada > 7 ||
      Math.round(notaAcreditada * 10) !== notaAcreditada * 10
    )
      throw new ConflictException(
        'La nota acreditada debe estar entre 5.0 y 7.0, con un decimal',
      );
    const postulacion = await this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.postulacionTutor.updateMany({
        where: { idPostulacion, estado: 'PENDIENTE' },
        data: {
          estado: 'PENDIENTE_ROL',
          idAdministradorRevision: idAdministrador,
          notaAcreditada,
          fechaRevision: new Date(),
        },
      });
      if (actualizada.count !== 1)
        throw new ConflictException('La postulación no está pendiente');
      const registro = await tx.postulacionTutor.findUniqueOrThrow({
        where: { idPostulacion },
      });
      await tx.tutorMateria.upsert({
        where: {
          idUsuario_idMateria: {
            idUsuario: registro.idUsuario,
            idMateria: registro.idMateria,
          },
        },
        create: {
          idUsuario: registro.idUsuario,
          idMateria: registro.idMateria,
          vigente: false,
        },
        update: { vigente: false },
      });
      return registro;
    });
    await this.asignarRolYHabilitar(postulacion);
    const aprobada = await this.prisma.postulacionTutor.findUniqueOrThrow({
      where: { idPostulacion },
    });
    return this.mapearPostulacion(aprobada);
  }

  async reintentarAsignacion(idPostulacion: bigint) {
    const postulacion = await this.prisma.postulacionTutor.findUnique({
      where: { idPostulacion },
    });
    if (!postulacion || postulacion.estado !== 'PENDIENTE_ROL') {
      throw new ConflictException('La postulación no espera asignación de rol');
    }
    await this.asignarRolYHabilitar(postulacion);
    const aprobada = await this.prisma.postulacionTutor.findUniqueOrThrow({
      where: { idPostulacion },
    });
    return this.mapearPostulacion(aprobada);
  }

  private async asignarRolYHabilitar(
    postulacion: PostulacionTutor,
  ): Promise<void> {
    const url = this.config.get<string>('USUARIOS_AUTH_ASIGNAR_TUTOR_URL');
    const clave = this.config.get<string>('INTEGRACION_SECRET');
    if (!url || !clave)
      throw new ServiceUnavailableException(
        'La asignación del rol TUTOR no está configurada',
      );
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Integracion-Secret': clave,
        },
        body: JSON.stringify({
          idUsuario: postulacion.idUsuario.toString(),
          rol: 'TUTOR',
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!respuesta.ok) throw new Error(`Respuesta ${respuesta.status}`);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo asignar el rol TUTOR; la postulación queda pendiente de reintento',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.tutorMateria.update({
        where: {
          idUsuario_idMateria: {
            idUsuario: postulacion.idUsuario,
            idMateria: postulacion.idMateria,
          },
        },
        data: { vigente: true, fechaHabilitacion: new Date() },
      });
      await tx.postulacionTutor.update({
        where: { idPostulacion: postulacion.idPostulacion },
        data: { estado: 'APROBADA' },
      });
      await tx.perfilTutor.upsert({
        where: { idUsuario: postulacion.idUsuario },
        create: { idUsuario: postulacion.idUsuario },
        update: {},
      });
    });
  }
}
