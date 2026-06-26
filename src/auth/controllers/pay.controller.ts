import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Headers,
    Header,
    Req,
    BadRequestException,
    UseGuards
} from '@nestjs/common';
import { Request } from 'express';
import { PayService } from '../services/pay.services';
import { MailDto } from '../dto/update-pwd-user.dto';
import { ApiOperation } from '@nestjs/swagger';
import { getPaymentHtmlTemplate } from '../tools/html-structure';
import { AuthGuard } from '../auth.guard';


@Controller('auth')
export class PayController {
    constructor(private readonly payService: PayService) { }

    @Post('paymethods')
    @ApiOperation({ summary: 'POST /auth/paymethods - Crear Suscripción en Stripe' })
    async paymethods(@Body() mailDto: MailDto) {
        return await this.payService.createSubscription(mailDto);
    }

    // ── Cancelar suscripción ──────────────────────────────────────────────────
    @Delete('paymethods')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'DELETE /auth/paymethods - Cancelar Suscripción en Stripe' })
    async cancelPaymethod(@Body() mailDto: MailDto) {
        return await this.payService.cancelSubscription(mailDto);
    }

    @Post('stripe/webhook')
    async stripeWebhook(
        @Headers('stripe-signature') signature: string | undefined,
        @Req() req: Request & { rawBody?: Buffer },
    ) {
        if (!signature) {
            throw new BadRequestException('Falta la firma de Stripe');
        }

        const rawBody = req.rawBody;

        if (!rawBody) {
            throw new BadRequestException('El cuerpo de la petición (rawBody) está vacío o no configurado.');
        }

        return await this.payService.handleWebhook(signature, rawBody);
    }

    @Get('pay/success')
    @Header('Content-Type', 'text/html; charset=utf-8')
    paymentSuccess() {
        return getPaymentHtmlTemplate({
            title: '¡Pago Exitoso!',
            message: 'Vuelve a la aplicacion para disfrutar de tu suscripción, si ya estas logeado, cierra sesión y vuelve a ingresar.',
            isSuccess: true,
            buttonText: 'Volver a la aplicación',
        });
    }

    @Get('pay/failed')
    @Header('Content-Type', 'text/html; charset=utf-8')
    paymentFailed() {
        return getPaymentHtmlTemplate({
            title: 'Pago Cancelado o Rechazado',
            message: 'Hubo un problema al procesar tu transacción o decidiste cancelar el proceso. Vuelve a la aplicación para intentar nuevamente o revisar tus métodos de pago.',
            isSuccess: false,
            buttonText: 'Intentar nuevamente desde la app',
        });
    }
}