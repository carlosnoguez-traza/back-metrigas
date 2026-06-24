import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { MailDto } from '../dto/update-pwd-user.dto';
import Stripe from 'stripe';
import { Resend } from 'resend';

@Injectable()
export class PayService {
    private stripe: Stripe;
    private resend: Resend;

    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
    ) {
        this.stripe = new Stripe(process.env.STRIPE_API_KEY!, {
            apiVersion: '2024-04-10' as any,
        });
        this.resend = new Resend(process.env.RESEND_API_KEY!);
    }

    async createSubscription(mailDto: MailDto) {
        const { email } = mailDto;

        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new NotFoundException(`Usuario con email ${email} no encontrado`);
        }

        const session = await this.stripe.checkout.sessions.create({
            line_items: [{ price: 'price_1TjkBQRFZd5tQ6sq0QTvtUDr', quantity: 1 }],
            mode: 'subscription',
            // Si ya tiene customerId lo reutiliza, si no, Stripe crea uno nuevo con el email
            ...(user.stripeCustomerId
                ? { customer: user.stripeCustomerId }
                : { customer_email: user.email }),
            metadata: {
                userId: user.id.toString(),
            },
            success_url: 'http://localhost:3000/auth/pay/success',
            cancel_url: 'http://localhost:3000/auth/pay/failed',
        });

        return { url: session.url };
    }

    // ── Cancelar suscripción ──────────────────────────────────────────────────
    async cancelSubscription(mailDto: MailDto) {
        const { email } = mailDto;

        // 1. Buscar el usuario en la BD
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new NotFoundException(`Usuario con email ${email} no encontrado`);
        }

        // 2. Verificar que tenga una suscripción activa en Stripe
        if (!user.stripeSubscriptionId) {
            throw new BadRequestException(`El usuario ${email} no tiene una suscripción activa`);
        }

        // 3. Cancelar la suscripción en Stripe al final del período ya pagado
        //    cancel_at_period_end: true → no corta el acceso de inmediato, espera al fin del ciclo
        //    Si prefieres cancelación inmediata, usa: this.stripe.subscriptions.cancel(user.stripeSubscriptionId)
        await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        // 4. Limpiar los datos de Stripe y desactivar en la BD
        await this.userRepository.update(user.id, {
            isActive: false,
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: '',
        });

        console.log(`Suscripción de usuario ${user.id} cancelada y limpiada correctamente.`);

        return {
            message: `Suscripción cancelada correctamente. El usuario ${email} puede volver a suscribirse desde /auth/paymethods.`,
        };
    }

    async handleWebhook(signature: string, rawBody: Buffer) {
        let event;

        try {
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!,
            );
        } catch (err) {
            throw new BadRequestException(`Webhook Error: `);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            const userId = session.metadata?.userId;
            const stripeCustomerId = session.customer;
            const stripeSubscriptionId = session.subscription;

            if (userId) {
                await this.userRepository.update(userId, {
                    isActive: true,
                    stripeCustomerId: stripeCustomerId as string,
                    stripeSubscriptionId: stripeSubscriptionId as string,
                });

                console.log(`Usuario ${userId} actualizado a Premium exitosamente.`);
            }
        }

        if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object;
            const stripeSubscriptionId = invoice.subscription as string;

            if (stripeSubscriptionId) {
                const user = await this.userRepository.findOne({
                    where: { stripeSubscriptionId },
                });

                if (user) {
                    await this.userRepository.update(user.id, { isActive: false });

                    console.log(`Usuario ${user.id} marcado como inactivo por pago fallido (intento #${invoice.attempt_count}).`);

                    await this.resend.emails.send({
                        from: 'Tu Empresa <noreply@tudominio.com>',
                        to: user.email,
                        subject: `⚠️ No pudimos procesar tu pago`,
                        html: `
                            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
                                <h2 style="color:#DC2626;">Tuvimos un problema con tu pago</h2>
                                <p>Hola <strong>${user.username ?? 'Cliente'}</strong>,</p>
                                <p>
                                    No pudimos cobrar <strong>$${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}</strong>
                                    de tu método de pago registrado (intento #${invoice.attempt_count}).
                                </p>
                                <p>Tu suscripción ha sido <strong>pausada temporalmente</strong> hasta que el pago sea procesado.</p>
                                ${invoice.next_payment_attempt
                                ? `<p>Realizaremos un nuevo intento el <strong>${new Date(invoice.next_payment_attempt * 1000).toLocaleDateString('es-MX')}</strong>.</p>`
                                : `<p>No hay más intentos programados. Tu suscripción ha sido suspendida.</p>`
                            }
                                ${invoice.hosted_invoice_url
                                ? `<a href="${invoice.hosted_invoice_url}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
                                           Ver y pagar mi factura
                                       </a>`
                                : ''
                            }
                                <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
                                <p style="font-size:12px;color:#999;">¿Necesitas ayuda? Contáctanos en soporte@tudominio.com</p>
                            </div>
                        `,
                    });

                    console.log(`Correo de pago fallido enviado a ${user.email}.`);
                } else {
                    console.warn(`No se encontró usuario con stripeSubscriptionId: ${stripeSubscriptionId}`);
                }
            }
        }

        return { received: true };
    }
}