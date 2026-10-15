import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class SaludController {
  @Get()
  consultarSalud() {
    return { estado: 'ok', servicio: 'api-gateway' };
  }
}
