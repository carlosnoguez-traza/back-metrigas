import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto, VerifyCodeDto, LoginDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import bycrypt from 'bcryptjs';
import { Resend } from 'resend';
import { JwtService } from '@nestjs/jwt';
import { MailDto, UpdatePwdUserDto } from './dto/update-pwd-user.dto';
import Stripe from 'stripe';

@Injectable()
export class AuthService {
  private stripe: Stripe;
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,

  ) {
    this.stripe = new Stripe('sk_test_51Tj45zRFZd5tQ6sqTU3fSPETQESZPZL2nYlH0PLNrOJoIdWTwOfEKmgpSGU02iXGwREjkZdgDtjWr7ZtUsz6INe700o6wWE4cC', {
      apiVersion: '2024-04-10' as any,
    });
  }

  async signUp(createUserDto: CreateUserDto) {
    const { email, pwd } = createUserDto;

    // 1. Validar si el usuario ya existe
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) throw new BadRequestException('El correo ya está registrado');

    // 2. Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // Expira en 15 minutos

    // 3. Encriptar contraseña
    const hashedPassword = await bycrypt.hash(pwd, 10);

    // 4. Crear usuario (Inactivo)
    const newUser = this.userRepository.create({
      ...createUserDto,
      pwd: hashedPassword,
      verificationCode: code,
      verificationCodeExpires: expires,
    });
    await this.userRepository.save(newUser);

    // 5. Enviar correo con Resend
    try {
      const resend = new Resend(process.env.RESEND_API_KEY || '');
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Verifica tu cuenta',
        html: `<p>Tu código de verificación es: <strong>${code}</strong>. Expira en 15 minutos.</p>`,
      });
    } catch (error) {
      console.error('Error enviando correo', error);
    }

    return { message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.' };
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


  async createSubscription(mailDto: MailDto) {
    const { email } = mailDto;

    // 1. Identificar al usuario en Postgres
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    }

    // 2. Crear la sesión de checkout en Stripe
    const session = await this.stripe.checkout.sessions.create({
      line_items: [{ price: 'price_1TjkBQRFZd5tQ6sq0QTvtUDr', quantity: 1 }],
      mode: 'subscription',
      customer_email: user.email, // Stripe creará un cliente con este correo si no existe
      metadata: {
        userId: user.id.toString(), // 👈 Guardamos el ID del usuario aquí (Stripe solo acepta strings en metadata)
      },
      // El éxito en frontend solo visualiza, ya no procesa la lógica pesada
      success_url: 'http://localhost:3000/auth/pay/success',
      cancel_url: 'http://localhost:3000/auth/pay/failed',
    });

    return { url: session.url }; // Retornamos la URL a la que debe redirigirse el usuario para pagar
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    let event;

    try {
      // Validamos que el evento realmente venga de Stripe usando tu Webhook Secret Key
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        'whsec_5ef8945714cda8e2189c94fd64d3dc7a3c246ff4637bf3eb18f2a982d032f7e4', // Configura esto en tu .env
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: `);
    }

    // Escuchamos cuando un checkout se completa con éxito
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object; // Objeto de la sesión de Stripe

      const userId = session.metadata?.userId;
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription;

      if (userId) {
        // 3. Actualizamos la base de datos en Postgres mediante el repositorio
        await this.userRepository.update(userId, {
          isActive: true,
          stripeCustomerId: stripeCustomerId as string,
          stripeSubscriptionId: stripeSubscriptionId as string,
        });

        console.log(`Usuario ${userId} actualizado a Premium exitosamente.`);
      }
    }

    return { received: true };
  }

  async login(loginDto: LoginDto) {
    const { email, pwd } = loginDto;

    // 1. Buscar usuario
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // 2. Verificar que la cuenta está activa
    if (!user.isActive) throw new BadRequestException('La cuenta no está verificada. Por favor verifica tu correo');

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
      },
    };
  }

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
      const resend = new Resend('re_Ax3BbcwT_Lik3ekdgWdavPVRBsvopdFu8');
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