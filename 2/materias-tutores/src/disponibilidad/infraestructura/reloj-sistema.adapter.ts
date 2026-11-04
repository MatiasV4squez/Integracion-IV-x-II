import type { Reloj } from '../aplicacion/puertos/reloj.port.js';

export class RelojSistemaAdapter implements Reloj {
  ahora(): Date {
    return new Date();
  }
}
