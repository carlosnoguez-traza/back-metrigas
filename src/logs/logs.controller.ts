import { Controller, Get, Post, Body, UseGuards, Req, Query, Param } from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { AuthGuard } from '../auth/auth.guard';
import { GetMetricDto, MonthMeterDto } from './dto/get-metric.dto';
import { MetricsService } from './services/metrics.services';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MonthlyMetricsResponse } from './interfaces/monthly-metrics.interface';
import { PredictRechargeDto } from './dto/predict-rancharge.dto';
import { GetLogByMeterDto } from './dto/get-log-meter';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly metricsService: MetricsService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva lectura de un medidor' })
  @ApiBody({ type: CreateLogDto })
  @ApiResponse({ status: 201, description: 'Lectura registrada correctamente.' })
  @ApiResponse({ status: 400, description: 'currentPercentage inválido o meterId no existe.' })
  @ApiResponse({ status: 401, description: 'El usuario no es premium.' })
  async create(@Body() createLogDto: CreateLogDto) {
    const result = await this.logsService.create(createLogDto);
    return { ok: true, data: result };
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar métricas históricas de los medidores del usuario (paginado)' })
  @ApiResponse({ status: 200, description: 'Métricas obtenidas correctamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async getMetrics(@Query() getMetricDto: GetMetricDto, @Req() req: any) {
    const userId = req.user.sub;
    const result = await this.metricsService.consultMeters(getMetricDto, userId);
    return { ok: true, data: result }
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener la última lectura registrada de un medidor' })
  @ApiParam({ name: 'id', description: 'UUID del medidor', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiResponse({ status: 200, description: 'Última lectura obtenida correctamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 404, description: 'No se encontró ningún log para ese medidor.' })
  async getLastLogByMeterId(@Param() { id }: GetLogByMeterDto) {
    const log = await this.logsService.findLastByMeterId(id);
    return {
      ok: true,
      data: log,
    };
  }

  @Post('monthly')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener métricas de consumo de un medidor para un mes específico' })
  @ApiBody({ type: MonthMeterDto })
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

  @Post('ai')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Predecir fecha estimada de recarga usando IA basada en historial de consumo' })
  @ApiBody({ type: PredictRechargeDto })
  @ApiResponse({ status: 200, description: 'Predicción generada (o mensaje de datos insuficientes si hay menos de 15 lecturas).' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 404, description: 'El medidor no existe o no pertenece al usuario.' })
  async predictRecharge(@Body() predictRechargeDto: PredictRechargeDto, @Req() req: any) {
    const userId = req.user.sub;
    const result = await this.logsService.predictRecharge(predictRechargeDto.meterId, userId);
    return result;
  }
}