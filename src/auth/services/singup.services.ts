import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateUserDto, VerifyCodeDto } from '../dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import bycrypt from 'bcryptjs';
import { Resend } from 'resend';

@Injectable()
export class SingUpService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,

    ) { }

    async signUp(createUserDto: CreateUserDto) {
        const { email, pwd } = createUserDto;

        // 1. Buscar si el usuario ya existe
        const existingUser = await this.userRepository.findOne({ where: { email } });

        // 2. Preparar los datos del código (se usarán tanto para usuario nuevo como incompleto)
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15); // Expira en 15 minutos

        // 3. Encriptar la contraseña del formulario
        const hashedPassword = await bycrypt.hash(pwd, 10);

        // --- FLUJO A: EL USUARIO YA EXISTE EN LA BASE DE DATOS ---
        if (existingUser) {
            // Evaluamos si el registro previo quedó incompleto (isActive es false Y stripeCustomerId está vacío)
            if (!existingUser.isActive && !existingUser.stripeCustomerId) {

                // Reutilizamos el registro existente y lo actualizamos con los nuevos datos del intento
                this.userRepository.merge(existingUser, createUserDto, {
                    pwd: hashedPassword,
                    verificationCode: code,
                    verificationCodeExpires: expires,
                });
                await this.userRepository.save(existingUser);

                // Reenviamos el correo de verificación
                await this.sendVerificationEmail(email, code);

                return {
                    message: 'Se detectó un registro previo incompleto. Hemos renovado tu código, revisa tu correo para verificar tu cuenta.'
                };
            }

            // Si ya está activo o ya tiene un proceso con Stripe iniciado, sí es un duplicado real -> Error 400
            throw new BadRequestException('El correo ya está registrado');
        }

        // --- FLUJO B: CLIENTE COMPLETAMENTE NUEVO ---
        const newUser = this.userRepository.create({
            ...createUserDto,
            pwd: hashedPassword,
            verificationCode: code,
            verificationCodeExpires: expires,
        });
        await this.userRepository.save(newUser);

        // Enviar correo inicial
        await this.sendVerificationEmail(email, code);

        return { message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.' };
    }

    // Método auxiliar privado para evitar duplicar la lógica de Resend
    private async sendVerificationEmail(email: string, code: string) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: email,
                subject: 'Verifica tu cuenta',
                html: `<p>Tu código de verificación es: <strong>${code}</strong>. Expira en 15 minutos.</p>`,
            });
        } catch (error) {
            console.error('Error enviando correo con Resend:', error);
        }
    }

    async verifyCode(verifyCodeDto: VerifyCodeDto) {
        const { email, code } = verifyCodeDto;

        // 1. Buscar usuario
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        // 2. Verificar si ya está activo
        if (user.isActive) throw new BadRequestException('La cuenta ya está verificada');

        // 3. Validar código y expiración
        if (user.verificationCode !== code) {
            // Eliminar usuario si el código es incorrecto
            await this.userRepository.delete(user.id);
            throw new BadRequestException('El código es incorrecto. Usuario eliminado.');
        }

        if (!user.verificationCodeExpires || new Date() > user.verificationCodeExpires) {
            // Eliminar usuario si el código ha expirado
            await this.userRepository.delete(user.id);
            throw new BadRequestException('El código ha expirado. Usuario eliminado.');
        }

        // 4. Activar usuario y limpiar campos de verificación
        //user.isActive = true;
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await this.userRepository.save(user);

        return { message: 'Cuenta verificada con éxito. Ya puedes iniciar sesión.' };
    }
}