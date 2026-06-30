import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import { SingUpService } from '../services/singup.services';
import { CreateUserDto, VerifyCodeDto } from '../dto/create-user.dto';
import { ApiOperation, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class SingUpController {
    constructor(private readonly singUpService: SingUpService) { }

    @Post('/signup')
    @ApiOperation({ summary: 'Paso 1: Registro de usuario y envío de código de verificación al correo' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'Usuario registrado, código de verificación enviado al correo.' })
    @ApiResponse({ status: 400, description: 'El correo ya está registrado.' })
    signUp(@Body() createUserDto: CreateUserDto) {
        return this.singUpService.signUp(createUserDto);
    }

    @Post('/verify')
    @ApiOperation({ summary: 'Paso 2: Verificar el código de 6 dígitos enviado al correo' })
    @ApiBody({ type: VerifyCodeDto })
    @ApiResponse({ status: 200, description: 'Cuenta verificada con éxito.' })
    @ApiResponse({ status: 400, description: 'Código incorrecto o expirado (usuario eliminado).' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
    async verify(@Body() verifyCodeDto: VerifyCodeDto) {
        return this.singUpService.verifyCode(verifyCodeDto);
    }
}