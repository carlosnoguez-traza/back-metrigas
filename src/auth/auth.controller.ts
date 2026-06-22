import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  BadRequestException
} from '@nestjs/common';
import { Request } from 'express'; // 👈 Importante: Viene de express para evitar conflictos de tipos
import { AuthService } from './auth.service';
import { CreateUserDto, VerifyCodeDto, LoginDto } from './dto/create-user.dto';
import { MailDto, UpdatePwdUserDto } from './dto/update-pwd-user.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('/signup')
  @ApiOperation({ summary: 'Paso 1: Carga de datos y envio de correo' })
  signUp(@Body() createUserDto: CreateUserDto) {
    return this.authService.signUp(createUserDto);
  }

  @Post('/verify')
  @ApiOperation({ summary: 'Paso 2: Verificar el código enviado al correo' })
  async verify(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto);
  }

  @Post('paymethods')
  @ApiOperation({ summary: 'POST /auth/paymethods - Crear Suscripción en Stripe' })
  async paymethods(@Body() mailDto: MailDto) {
    return await this.authService.createSubscription(mailDto);
  }

  // Endpoint al que Stripe le pegará directamente por detrás
  @Post('stripe/webhook')
  async stripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    if (!signature) {
      throw new BadRequestException('Falta la firma de Stripe');
    }

    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new BadRequestException('El cuerpo de la petición (rawBody) está vacío o no configurado.');
    }

    return await this.authService.handleWebhook(signature, rawBody);
  }

  // Rutas simples solo de redirección visual para el usuario de tu app
  @Get('pay/success')
  paymentSuccess() {
    return { message: 'Tu pago está siendo procesado por el sistema. ¡Gracias!' };
  }

  @Get('pay/failed')
  paymentFailed() {
    return { message: 'El pago fue cancelado o rechazado.' };
  }

  @Post('/login')
  @ApiOperation({ summary: 'Login (solo para usuarios verificados)' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('/checkemailpwd/:email')
  @ApiOperation({ summary: 'Verificar email y enviar código de recuperación de contraseña' })
  async checkEmailPwd(@Param('email') email: string) {
    return this.authService.checkEmailPwd(email);
  }

  @Post('/checkemailpwd')
  @ApiOperation({ summary: 'Paso 2: Actualizar contraseña' })
  async updatePwd(@Body() updatePwdUserDto: UpdatePwdUserDto) {
    return this.authService.updatePwd(updatePwdUserDto);
  }
}