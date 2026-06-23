import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controladores
import { SingUpController } from './controllers/singup.controller';
import { LoginController } from './controllers/login.controller';
import { PasswordController } from './controllers/pasword.controller';
import { PayController } from './controllers/pay.controller';

// Servicios
import { SingUpService } from './services/singup.services';
import { LoginService } from './services/login.services';
import { PasswordService } from './services/password.services';
import { PayService } from './services/pay.services';

// Entidades
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    SingUpController,
    LoginController,
    PasswordController,
    PayController,
  ],
  providers: [
    SingUpService,
    LoginService,
    PasswordService,
    PayService,
  ],
})
export class AuthModule { }