import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import { LoginService } from '../services/login.services';
import { LoginDto } from '../dto/create-user.dto';
import { ApiOperation } from 'node_modules/@nestjs/swagger/dist/decorators/api-operation.decorator';


@Controller('auth')
export class LoginController {
    constructor(private readonly loginService: LoginService) { }

    @Post('/login')
    @ApiOperation({ summary: 'Login (solo para usuarios verificados)' })
    async login(@Body() loginDto: LoginDto) {
        return this.loginService.login(loginDto);
    }
}