import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLogDto } from './dto/create-log.dto';
import { Log } from './entities/log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Log)
    private readonly logsRepository: Repository<Log>,
  ) { }

  async create(createLogDto: CreateLogDto): Promise<Log> {
    const { currentPercentage, meterId } = createLogDto;

    // Validar que no se admitan porcentajes negativos
    if (currentPercentage < 0) {
      throw new BadRequestException(
        'currentPercentage must not be a negative number',
      );
    }

    // Validar que el porcentaje no supere 100
    if (currentPercentage > 100) {
      throw new BadRequestException(
        'currentPercentage must not exceed 100',
      );
    }

    // Asignar la fecha de medición automáticamente en el servidor
    const meditionDate = new Date();

    // Crear el nuevo log con UUID generado
    const newLog = this.logsRepository.create({
      currentPercentage,
      meditionDate,
      meterid: meterId,
    });

    try {
      const savedLog = await this.logsRepository.save(newLog);
      return savedLog;
    } catch (error) {
      throw new BadRequestException(
        'Invalid data: verify that meterId references an existing meter',
      );
    }
  }
}