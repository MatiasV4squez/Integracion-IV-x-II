import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { BlocksGateway } from './blocks.gateway';
import { HttpBlocksGateway } from './http-blocks.gateway';
import { BlockReservationsService } from './block-reservations.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    { provide: BlocksGateway, useClass: HttpBlocksGateway },
    BlockReservationsService,
  ],
  exports: [BlockReservationsService],
})
export class BlocksModule {}
