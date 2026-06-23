import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import { SingUpService } from '../services/singup.services';
import { CreateUserDto, VerifyCodeDto } from '../dto/create-user.dto';
import { ApiOperation } from 'node_modules/@nestjs/swagger/dist/decorators/api-operation.decorator';

@Controller('auth')
export class SingUpController {
    constructor(private readonly singUpService: SingUpService) { }
    @Post('/signup')
    @ApiOperation({ summary: 'Paso 1: Carga de datos y envio de correo' })
    signUp(@Body() createUserDto: CreateUserDto) {
        return this.singUpService.signUp(createUserDto);
    }

    @Post('/verify')
    @ApiOperation({ summary: 'Paso 2: Verificar el código enviado al correo' })
    async verify(@Body() verifyCodeDto: VerifyCodeDto) {
        return this.singUpService.verifyCode(verifyCodeDto);
    }
}
