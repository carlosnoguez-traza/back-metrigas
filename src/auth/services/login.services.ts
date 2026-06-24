import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { LoginDto } from '../dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import bycrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class LoginService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private jwtService: JwtService,

    ) { }

    async login(loginDto: LoginDto) {
        const { email, pwd } = loginDto;

        // 1. Buscar usuario
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        // 2. Verificar que la cuenta está activa
        if (user.stripeCustomerId === '') throw new BadRequestException('La cuenta no está verificada. Por favor verifica tu correo');

        // 3. Validar contraseña
        const isPasswordValid = await bycrypt.compare(pwd, user.pwd);
        if (!isPasswordValid) throw new BadRequestException('Correo o contraseña incorrectos');

        // 4. Generar JWT token
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload);

        // 5. Retornar token y datos del usuario
        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                age: user.age,
                subscriptionDate: user.subscriptionDate,
                isActive: user.isActive
            },
        };
    }
}