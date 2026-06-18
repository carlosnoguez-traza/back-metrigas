import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, VerifyCodeDto, LoginDto } from './dto/create-user.dto';
import { UpdatePwdUserDto } from './dto/update-pwd-user.dto';
import { ApiOperation } from 'node_modules/@nestjs/swagger/dist/decorators/api-operation.decorator';

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

  @Post('/login')
  @ApiOperation({ summary: 'Login (solo para usuarios verificados)' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('/checkemailpwd')
  @ApiOperation({ summary: 'Paso 1: Verificar email y contraseña para actualización de contraseña' })
  async checkEmailPwd(@Body() updatePwdUserDto: UpdatePwdUserDto) {
    return this.authService.checkEmailPwd(updatePwdUserDto);
  }

  @Post('/updatepwd')
  @ApiOperation({ summary: 'Paso 2: Actualizar contraseña' })
  async updatePwd(@Body() updatePwdUserDto: UpdatePwdUserDto) {
    return this.authService.updatePwd(updatePwdUserDto);
  }
}
