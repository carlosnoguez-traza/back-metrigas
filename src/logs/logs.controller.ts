import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ok } from 'assert';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) { }

  @Post()
  //@UseGuards(AuthGuard)
  async create(@Body() createLogDto: CreateLogDto) {
    const result = await this.logsService.create(createLogDto);
    return {
      ok: true,
      data: result
    };
  }
}
