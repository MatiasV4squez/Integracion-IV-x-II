import { Body, Controller, Post } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('blocks')
  async createBlock(@Body() createBlockDto: CreateBlockDto) {
    return this.sessionsService.createBlock(createBlockDto);
  }

  @Post()
  async createSession(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.createSession(createSessionDto);
  }
}