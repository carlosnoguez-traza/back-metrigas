import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meter } from './entities/meter.entity';
import { CreateMeterDto } from './dto/create-meter.dto';

@Injectable()
export class MetersService {
  constructor(
    @InjectRepository(Meter)
    private readonly meterRepository: Repository<Meter>,
  ) { }

  async bulkUpsertMeters(createMeterDtos: CreateMeterDto[]): Promise<void> {
    // 1. Transformamos el DTO al formato de la entidad
    const metersToUpsert = createMeterDtos.map((dto) => {
      return this.meterRepository.create({
        id: dto.id,
        metername: dto.metername,
        capacity: dto.capacity ? parseFloat(dto.capacity) : 0,
        ownerid: dto.ownerId,
      });
    });

    try {
      // 2. Ejecutamos el Upsert masivo corregido
      await this.meterRepository.upsert(metersToUpsert, {
        conflictPaths: ['id'], // Columna que dispara el conflicto (Primary Key)
      });
    } catch (error) {
      console.error('Error ejecutando el upsert masivo de medidores:', error);
      throw new InternalServerErrorException('No se pudieron sincronizar los medidores');
    }
  }

  async createMeter(createMeterDto: CreateMeterDto): Promise<void> {
    const meter = this.meterRepository.create({
      id: createMeterDto.id,
      metername: createMeterDto.metername,
      capacity: createMeterDto.capacity ? parseFloat(createMeterDto.capacity) : 0,
      ownerid: createMeterDto.ownerId,
    });

    try {
      await this.meterRepository.save(meter);
    } catch (error) {
      console.error('Error creando el medidor:', error);
      throw new InternalServerErrorException('No se pudo crear el medidor');
    }
  }

  async getMetersByOwner(ownerId: string): Promise<Meter[]> {
    return await this.meterRepository.find({
      where: { ownerid: ownerId },
    });
  }
}