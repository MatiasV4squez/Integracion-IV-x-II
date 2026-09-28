import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlocksGateway,
  type ReservationRequest,
  type ReservedSchedule,
} from './blocks.gateway';

@Injectable()
export class HttpBlocksGateway extends BlocksGateway {
  private readonly baseUrl: string | undefined;
  private readonly token: string | undefined;
  private readonly timeout: number;

  constructor(config: ConfigService) {
    super();
    this.baseUrl = config.get<string>('MATERIAS_TUTORES_URL')?.trim();
    this.token = config.get<string>('MATERIAS_TUTORES_TOKEN')?.trim();
    this.timeout = Number(config.get('MATERIAS_TUTORES_TIMEOUT_MS') ?? 4000);
    if (
      !Number.isInteger(this.timeout) ||
      this.timeout < 1 ||
      this.timeout > 5000
    )
      throw new Error('MATERIAS_TUTORES_TIMEOUT_MS debe estar entre 1 y 5000.');
    if (this.baseUrl) {
      const url = new URL(this.baseUrl);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
      )
        throw new Error(
          'MATERIAS_TUTORES_URL debe ser un origen HTTP/HTTPS sin credenciales.',
        );
    }
  }

  ensureConfigured(): void {
    if (!this.baseUrl || !this.token)
      throw new ServiceUnavailableException(
        'La integración con bloques de materias-tutores aún no está configurada.',
      );
  }

  async reserve(reservation: ReservationRequest): Promise<ReservedSchedule> {
    const response = await this.send(reservation, 'RESERVADA');
    await this.checkStatus(response, false);
    let body: unknown;
    try {
      body = await response.json();
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        ['TimeoutError', 'AbortError'].includes(error.name)
      )
        throw new ServiceUnavailableException(
          'Materias-tutores no está disponible.',
        );
      throw new BadGatewayException(
        'Respuesta de reserva inválida de materias-tutores.',
      );
    }
    return this.parseSchedule(body, reservation);
  }

  async release(reservation: ReservationRequest): Promise<void> {
    const response = await this.send(reservation, 'LIBERADA');
    await this.checkStatus(response, true);
    // El contrato exige 204 incluso para una liberación repetida o preventiva.
    // Un 404 no confirma la liberación ni impide una reserva tardía.
  }

  private async send(reservation: ReservationRequest, state: string) {
    this.ensureConfigured();
    const url = new URL(
      `/internal/v1/bloques/${reservation.id_bloque}/reservas/${reservation.id}`,
      this.baseUrl,
    );
    try {
      return await fetch(url, {
        method: 'PUT',
        redirect: 'error',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: state,
          id_tutor: reservation.id_tutor.toString(),
          id_materia: reservation.id_materia.toString(),
        }),
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Materias-tutores no está disponible.',
      );
    }
  }

  private async checkStatus(
    response: Response,
    releasing: boolean,
  ): Promise<void> {
    if (response.status === (releasing ? 204 : 200)) return;
    await response.body?.cancel().catch(() => undefined);
    if (!releasing && response.status === 404)
      throw new NotFoundException('El bloque o la materia no existe.');
    if (!releasing && response.status === 409)
      throw new ConflictException(
        'El bloque no se puede reservar para ese tutor y materia.',
      );
    if (response.status >= 500 || response.status === 429)
      throw new ServiceUnavailableException(
        'Materias-tutores no está disponible.',
      );
    throw new BadGatewayException(
      'Materias-tutores no cumplió el contrato de bloques.',
    );
  }

  private parseSchedule(
    body: unknown,
    reservation: ReservationRequest,
  ): ReservedSchedule {
    if (!body || typeof body !== 'object') throw this.invalidSchedule();
    const value = body as Record<string, unknown>;
    if (
      value.id_reserva !== reservation.id ||
      value.estado !== 'RESERVADA' ||
      value.id_bloque !== reservation.id_bloque.toString() ||
      value.id_tutor !== reservation.id_tutor.toString() ||
      value.id_materia !== reservation.id_materia.toString()
    )
      throw this.invalidSchedule();
    const inicio = this.parseInstant(value.inicio);
    const fin = this.parseInstant(value.fin);
    if (fin <= inicio) throw this.invalidSchedule();
    return { inicio, fin };
  }

  private parseInstant(value: unknown): Date {
    // El propietario convierte día/hora local a UTC. Solo aceptamos UTC canónico.
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    )
      throw this.invalidSchedule();
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== value)
      throw this.invalidSchedule();
    return date;
  }

  private invalidSchedule() {
    return new BadGatewayException(
      'Materias-tutores devolvió una reserva u horario inválido.',
    );
  }
}
