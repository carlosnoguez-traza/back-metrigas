import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MetersService } from './meters.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';

@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Post()
  create(@Body() createMeterDto: CreateMeterDto) {
    return this.metersService.create(createMeterDto);
  }

  @Get()
  findAll() {
    return this.metersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.metersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMeterDto: UpdateMeterDto) {
    return this.metersService.update(+id, updateMeterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.metersService.remove(+id);
  }
}
