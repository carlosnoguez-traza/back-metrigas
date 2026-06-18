import { Module } from '@nestjs/common';
import { MetersService } from './meters.service';
import { MetersController } from './meters.controller';

@Module({
  controllers: [MetersController],
  providers: [MetersService],
})
export class MetersModule {}
