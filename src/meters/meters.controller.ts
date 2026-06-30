import { Controller, Post, Body, UseGuards, ParseArrayPipe, Get, Put, Req } from '@nestjs/common';
import { MetersService } from './meters.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('meters')
@ApiBearerAuth()
@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) { }

  @Post('migrate')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Sincronización masiva de medidores (upsert por lote)' })
  @ApiBody({ type: [CreateMeterDto], description: 'Arreglo de medidores a crear o actualizar' })
  @ApiResponse({ status: 201, description: 'Medidores sincronizados y actualizados correctamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 500, description: 'No se pudieron sincronizar los medidores.' })
  async uploadBulkMeters(
    @Body(new ParseArrayPipe({ items: CreateMeterDto })) createMeterDtos: CreateMeterDto[]
  ) {
    await this.metersService.bulkUpsertMeters(createMeterDtos);
    return {
      ok: true,
      message: 'Medidores sincronizados y actualizados correctamente',
    };
  }

  @Put()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Crear un nuevo medidor' })
  @ApiBody({ type: CreateMeterDto })
  @ApiResponse({ status: 200, description: 'Medidor creado correctamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 500, description: 'No se pudo crear el medidor.' })
  async createMeter(@Body() createMeterDto: CreateMeterDto) {
    await this.metersService.createMeter(createMeterDto);
    return {
      ok: true,
      message: 'Medidor creado correctamente',
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Obtener la lista de medidores del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de medidores obtenida correctamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async getMeters(@Req() request: Request) {
    // Extraemos el ID del usuario autenticado desde el token JWT
    const userId = request['user'].sub;

    const meters = await this.metersService.getMetersByOwner(userId);

    return {
      ok: true,
      message: 'Lista de medidores obtenida correctamente',
      data: meters,
    };
  }
}