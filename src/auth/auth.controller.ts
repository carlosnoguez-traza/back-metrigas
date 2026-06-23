import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Header,
  Req,
  BadRequestException
} from '@nestjs/common';
import { Request } from 'express'; // 👈 Importante: Viene de express para evitar conflictos de tipos
import { AuthService } from './auth.service';
import { CreateUserDto, VerifyCodeDto, LoginDto } from './dto/create-user.dto';
import { MailDto, UpdatePwdUserDto } from './dto/update-pwd-user.dto';
import { ApiOperation } from 'node_modules/@nestjs/swagger/dist/decorators/api-operation.decorator';
import { getPaymentHtmlTemplate } from './tools/html-structure';

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
  @Header('Content-Type', 'text/html; charset=utf-8')
  paymentSuccess() {
    return getPaymentHtmlTemplate({
      title: '¡Pago Exitoso!',
      message: 'Vuelve a la aplicacion para iniciar sesión y disfrutar de tu suscripción.',
      isSuccess: true,
      buttonText: 'Volver a la aplicación',
    });
  }

  @Get('pay/failed')
  @Header('Content-Type', 'text/html; charset=utf-8')
  paymentFailed() {
    return getPaymentHtmlTemplate({
      title: 'Pago Cancelado o Rechazado',
      message: 'Hubo un problema al procesar tu transacción o decidiste cancelar el proceso. Vuelve a la aplicación para intentar nuevamente o revisar tus métodos de pago.',
      isSuccess: false,
      buttonText: 'Intentar nuevamente desde la app',
    });
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