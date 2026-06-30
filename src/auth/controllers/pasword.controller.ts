import {
    Controller,
    Post,
    Get,
    Body,
    Param,
} from '@nestjs/common';
import { PasswordService } from '../services/password.services';
import { UpdatePwdUserDto } from '../dto/update-pwd-user.dto';
import { ApiOperation, ApiTags, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class PasswordController {
    constructor(private readonly passwordService: PasswordService) { }

    @Get('/checkemailpwd/:email')
    @ApiOperation({ summary: 'Paso 1: Verificar email y enviar código de recuperación de contraseña' })
    @ApiParam({ name: 'email', description: 'Correo electrónico del usuario', example: 'usuario@correo.com' })
    @ApiResponse({ status: 200, description: 'Código de recuperación enviado al correo.' })
    @ApiResponse({ status: 404, description: 'Correo no registrado.' })
    async checkEmailPwd(@Param('email') email: string) {
        return this.passwordService.checkEmailPwd(email);
    }

    @Post('/checkemailpwd')
    @ApiOperation({ summary: 'Paso 2: Validar código y actualizar contraseña' })
    @ApiBody({ type: UpdatePwdUserDto })
    @ApiResponse({ status: 200, description: 'Contraseña actualizada con éxito.' })
    @ApiResponse({ status: 400, description: 'Código incorrecto o expirado.' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
    async updatePwd(@Body() updatePwdUserDto: UpdatePwdUserDto) {
        return this.passwordService.updatePwd(updatePwdUserDto);
    }
}