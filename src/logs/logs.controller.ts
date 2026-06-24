import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) { }

  @Post()
  //@UseGuards(AuthGuard)
  create(@Body() createLogDto: CreateLogDto) {
    return this.logsService.create(createLogDto);
  }
}
