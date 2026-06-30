import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import { LoginService } from '../services/login.services';
import { LoginDto } from '../dto/create-user.dto';
import { ApiOperation, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class LoginController {
    constructor(private readonly loginService: LoginService) { }

    @Post('/login')
    @ApiOperation({ summary: 'Login (solo para usuarios verificados)' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: 'Login exitoso, retorna token de acceso.' })
    @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
    @ApiResponse({ status: 403, description: 'El usuario no ha verificado su cuenta.' })
    async login(@Body() loginDto: LoginDto) {
        return this.loginService.login(loginDto);
    }
}