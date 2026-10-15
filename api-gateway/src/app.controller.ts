import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  @Get()
  consultarSalud() {
    return { estado: 'ok', servicio: 'api-gateway' };
  }
}
