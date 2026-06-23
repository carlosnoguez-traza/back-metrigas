import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import bycrypt from 'bcryptjs';
import { Resend } from 'resend';
import { UpdatePwdUserDto } from '../dto/update-pwd-user.dto';


@Injectable()
export class PasswordService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,

    ) { }

    async checkEmailPwd(email: string) {
        // 1. Verificar si el email existe en la base de datos
        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (!existingUser) throw new NotFoundException('Correo no registrado');

        // 2. Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15); // Expira en 15 minutos

        // 3. Guardar código y expiración en el usuario
        existingUser.verificationCode = code;
        existingUser.verificationCodeExpires = expires;
        await this.userRepository.save(existingUser);

        // 4. Enviar correo con Resend
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: email,
                subject: 'Recuperación de contraseña',
                html: `<p>Tu código de recuperación es: <strong>${code}</strong>. Expira en 15 minutos.</p>`,
            });
        } catch (error) {
            console.error('Error enviando correo', error);
        }

        return { message: 'Código enviado al correo electrónico' };
    }

    async updatePwd(updatePwdUserDto: UpdatePwdUserDto) {
        const { email, pwd, code } = updatePwdUserDto;

        // 1. Buscar usuario
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        // 2. Validar código y expiración
        if (user.verificationCode !== code) {
            throw new BadRequestException('El código es incorrecto.');
        }

        if (!user.verificationCodeExpires || new Date() > user.verificationCodeExpires) {
            throw new BadRequestException('El código ha expirado.');
        }

        // 3. Encriptar nueva contraseña
        const hashedPassword = await bycrypt.hash(pwd, 10);

        // 4. Actualizar contraseña y limpiar campos de verificación
        user.pwd = hashedPassword;
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await this.userRepository.save(user);


        return { message: 'Contraseña actualizada con éxito' };
    }

}