import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';
import { Meter } from './entities/meter.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meter]),
    AuthModule,
  ],
  controllers: [MetersController],
  providers: [MetersService],
})
export class MetersModule { }