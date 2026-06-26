import {
    Controller,
    Post,
    Get,
    Body,
    Param,
} from '@nestjs/common';
import { PasswordService } from '../services/password.services';
import { UpdatePwdUserDto } from '../dto/update-pwd-user.dto';
import { ApiOperation } from '@nestjs/swagger';


@Controller('auth')
export class PasswordController {
    constructor(private readonly passwordService: PasswordService) { }

    @Get('/checkemailpwd/:email')
    @ApiOperation({ summary: 'Verificar email y enviar código de recuperación de contraseña' })
    async checkEmailPwd(@Param('email') email: string) {
        return this.passwordService.checkEmailPwd(email);
    }

    @Post('/checkemailpwd')
    @ApiOperation({ summary: 'Paso 2: Actualizar contraseña' })
    async updatePwd(@Body() updatePwdUserDto: UpdatePwdUserDto) {
        return this.passwordService.updatePwd(updatePwdUserDto);
    }
}
