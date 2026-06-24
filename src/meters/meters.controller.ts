import { Controller, Post, Body, UseGuards, ParseArrayPipe, Get, Put, Req } from '@nestjs/common';
import { MetersService } from './meters.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) { }

  @Post('migrate')
  @UseGuards(AuthGuard)
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
  async createMeter(@Body() createMeterDto: CreateMeterDto) {
    await this.metersService.createMeter(createMeterDto);
    return {
      ok: true,
      message: 'Medidor creado correctamente',
    };
  }

  @Get()
  @UseGuards(AuthGuard)
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