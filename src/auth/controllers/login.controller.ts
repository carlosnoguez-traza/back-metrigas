import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import { LoginService } from '../services/login.services';
import { LoginDto } from '../dto/create-user.dto';
import { ApiOperation } from '@nestjs/swagger';


@Controller('auth')
export class LoginController {
    constructor(private readonly loginService: LoginService) { }

    @Post('/login')
    @ApiOperation({ summary: 'Login (solo para usuarios verificados)' })
    async login(@Body() loginDto: LoginDto) {
        return this.loginService.login(loginDto);
    }
}