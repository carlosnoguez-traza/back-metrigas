import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsController } from './logs.controller';
import { AuthModule } from '../auth/auth.module';
import { LogsService } from './logs.service';
import { Log } from './entities/log.entity';
import { Meter } from '../meters/entities/meter.entity';
import { MetricsService } from './services/metrics.services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log, Meter]),
    AuthModule,
  ],
  controllers: [LogsController],
  providers: [LogsService, MetricsService],
})
export class LogsModule { }