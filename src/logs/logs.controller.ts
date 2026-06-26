import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { AuthGuard } from '../auth/auth.guard';
import { GetMetricDto, MonthMeterDto } from './dto/get-metric.dto';
import { MetricsService } from './services/metrics.services';
import { ApiResponse } from '@nestjs/swagger';
import { MonthlyMetricsResponse } from './interfaces/monthly-metrics.interface';

@Controller('logs')
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly metricsService: MetricsService, // 👈 faltaba esto
  ) { }

  @Post()
  async create(@Body() createLogDto: CreateLogDto) {
    const result = await this.logsService.create(createLogDto);
    return { ok: true, data: result };
  }

  @Get()
  @UseGuards(AuthGuard)
  async getMetrics(@Query() getMetricDto: GetMetricDto, @Req() req: any) {
    const userId = req.user.sub;
    const result = this.metricsService.consultMeters(getMetricDto, userId);
    return { ok: true, data: result }
  }

  @Post('monthly')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: MonthlyMetricsResponse })
  @ApiResponse({ status: 400, description: 'Future month or out of range' })
  @ApiResponse({ status: 403, description: 'You are not the meter owner' })
  async getMonthlyMetrics(
    @Body() monthMetricDto: MonthMeterDto,
    @Req() req: any,
  ): Promise<MonthlyMetricsResponse> {
    const userId = req.user.sub;
    const metricsbymonth = this.metricsService.getMonthlyMetrics(monthMetricDto, userId);
    return metricsbymonth
  }
}
