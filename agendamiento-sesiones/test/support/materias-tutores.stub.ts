import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { type AddressInfo } from 'node:net';

interface Block {
  id_bloque: string;
  id_tutor: string;
  id_materia: string;
  inicio: string;
  fin: string;
  active: boolean;
}
interface Reservation {
  id_bloque: string;
  estado: 'RESERVADA' | 'LIBERADA';
}

// Solo para pruebas del consumidor. No implementa el microservicio de Víctor.
export class MateriasTutoresStub {
  readonly blocks = new Map<string, Block>();
  readonly reservations = new Map<string, Reservation>();
  readonly calls: Array<{ id: string; state: string }> = [];
  releaseStatus = 204;
  reserveStatus = 200;
  loseReserveResponse = false;
  invalidSchedule = false;
  delayedReserveMs = 0;
  private nextId = 9007199254741000n;
  private readonly server = createServer((req, res) => {
    void this.handle(req, res).catch(() => res.destroy());
  });

  constructor(private readonly token: string) {}

  async start(): Promise<string> {
    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
    const address = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}`;
  }

  async close(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      this.server.close((error) => (error ? reject(error) : resolve())),
    );
  }

  reset() {
    this.blocks.clear();
    this.reservations.clear();
    this.calls.length = 0;
    this.releaseStatus = 204;
    this.reserveStatus = 200;
    this.loseReserveResponse = false;
    this.invalidSchedule = false;
    this.delayedReserveMs = 0;
  }

  addBlock(
    tutor: string,
    materia: string,
    day = '2099-06-20',
    start = '10:00',
    end = '11:00',
  ) {
    const block: Block = {
      id_bloque: (++this.nextId).toString(),
      id_tutor: tutor,
      id_materia: materia,
      inicio: `${day}T${start}:00.000Z`,
      fin: `${day}T${end}:00.000Z`,
      active: true,
    };
    this.blocks.set(block.id_bloque, block);
    return block;
  }

  private async handle(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const match = req.url?.match(
      /^\/internal\/v1\/bloques\/(\d+)\/reservas\/([a-f0-9-]+)$/,
    );
    if (req.method !== 'PUT' || !match) {
      res.writeHead(404).end();
      return;
    }
    if (req.headers.authorization !== `Bearer ${this.token}`) {
      res.writeHead(401).end();
      return;
    }
    const parts: Buffer[] = [];
    for await (const part of req) parts.push(Buffer.from(part));
    const body = JSON.parse(Buffer.concat(parts).toString()) as Record<
      string,
      string
    >;
    const [, blockId, id] = match;
    this.calls.push({ id, state: body.estado });
    if (body.estado === 'LIBERADA') {
      if (this.releaseStatus !== 204) {
        res.writeHead(this.releaseStatus).end();
        return;
      }
      this.reservations.set(id, { id_bloque: blockId, estado: 'LIBERADA' });
      res.writeHead(204).end();
      return;
    }
    // Retraso antes de reservar: una liberación puede llegar primero.
    if (this.delayedReserveMs)
      await new Promise((resolve) =>
        setTimeout(resolve, this.delayedReserveMs),
      );
    if (this.reserveStatus !== 200) {
      res.writeHead(this.reserveStatus).end();
      return;
    }
    const block = this.blocks.get(blockId);
    if (!block) {
      res.writeHead(404).end();
      return;
    }
    const prior = this.reservations.get(id);
    const occupied = [...this.reservations.entries()].some(
      ([key, value]) =>
        key !== id &&
        value.id_bloque === blockId &&
        value.estado === 'RESERVADA',
    );
    if (
      prior?.estado === 'LIBERADA' ||
      occupied ||
      !block.active ||
      block.id_tutor !== body.id_tutor ||
      block.id_materia !== body.id_materia
    ) {
      res.writeHead(409).end();
      return;
    }
    this.reservations.set(id, { id_bloque: blockId, estado: 'RESERVADA' });
    if (this.loseReserveResponse) {
      res.destroy();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        id_reserva: id,
        estado: 'RESERVADA',
        ...block,
        ...(this.invalidSchedule ? { inicio: '2099-02-30T10:00:00.000Z' } : {}),
      }),
    );
  }
}
