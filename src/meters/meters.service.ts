import { Injectable } from '@nestjs/common';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';

@Injectable()
export class MetersService {
  create(createMeterDto: CreateMeterDto) {
    return 'This action adds a new meter';
  }

  findAll() {
    return `This action returns all meters`;
  }

  findOne(id: number) {
    return `This action returns a #${id} meter`;
  }

  update(id: number, updateMeterDto: UpdateMeterDto) {
    return `This action updates a #${id} meter`;
  }

  remove(id: number) {
    return `This action removes a #${id} meter`;
  }
}
