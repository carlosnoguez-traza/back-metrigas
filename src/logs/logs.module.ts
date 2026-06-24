import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsController } from './logs.controller';
import { AuthModule } from '../auth/auth.module';
import { LogsService } from './logs.service';
import { Log } from './entities/log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log]),
    AuthModule,
  ],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule { }