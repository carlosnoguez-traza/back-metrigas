import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { MailDto } from '../dto/update-pwd-user.dto';
import Stripe from 'stripe';

@Injectable()
export class PayService {
    private stripe: Stripe;
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,

    ) {
        this.stripe = new Stripe(process.env.STRIPE_API_KEY!, {
            apiVersion: '2024-04-10' as any,
        });
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
                process.env.STRIPE_WEBHOOK_SECRET!,
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

}