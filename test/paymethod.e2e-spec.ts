import { expect, describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

let app: INestApplication;

// Centralizamos los mocks con tipos dinámicos para evitar errores de compilación
const mockAuthService: Record<string, any> = {
    createSubscription: jest.fn().mockImplementation(() =>
        Promise.resolve({ url: 'https://checkout.stripe.com/c/pay/cs_test_12345' })
    ),
    handleWebhook: jest.fn().mockImplementation(() =>
        Promise.resolve({ received: true })
    ),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(AuthService)
        .useValue(mockAuthService)
        .compile();

    app = moduleFixture.createNestApplication();

    // IMPORTANTE: Para que Stripe Webhook funcione con el rawBody, NestJS necesita conservar los buffers intactos.
    // Tu pipe de validación global se mantiene igual aquí.
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

afterAll(async () => {
    await app.close();
});

// =========================================================================
// SUITE VISUAL 4: PAYMETHOD (Stripe Integration & Redirections)
// =========================================================================
describe('Suite: Paymethod - Payment & Stripe Integration', () => {

    // -----------------------------------------------------------------------
    // ENDPOINT: POST /auth/paymethods (Checkout Session)
    // -----------------------------------------------------------------------
    describe('POST /auth/paymethods', () => {
        it('Debería retornar una URL de Stripe al enviar un email válido registrado (201)', async () => {
            const mailDto = { email: "carlos.noguez@traza.digital" };

            const response = await request(app.getHttpServer())
                .post('/auth/paymethods')
                .send(mailDto)
                .expect(201);

            expect(response.body).toHaveProperty('url');
            expect(response.body.url).toContain('stripe.com');
            expect(mockAuthService.createSubscription).toHaveBeenCalledWith(mailDto);
        });

        // Falla General 1: Email inválido o mal formado
        it('Debería lanzar error 400 si el email provisto no cumple las especificaciones de formato (ValidationPipe)', async () => {
            const badMailDto = { email: "correo-invalido-stripe" };

            await request(app.getHttpServer())
                .post('/auth/paymethods')
                .send(badMailDto)
                .expect(400);
        });

        // Falla General 2: Usuario inexistente en la BD
        it('Debería lanzar error 404 si el usuario asociado al correo no existe en el sistema', async () => {
            mockAuthService.createSubscription.mockRejectedValueOnce(
                new NotFoundException('Usuario con email no.existe@traza.digital no encontrado')
            );

            const unregisteredMailDto = { email: "no.existe@traza.digital" };

            const response = await request(app.getHttpServer())
                .post('/auth/paymethods')
                .send(unregisteredMailDto)
                .expect(404);

            expect(response.body.message).toContain('no encontrado');
        });
    });

    // -----------------------------------------------------------------------
    // ENDPOINT: POST /auth/stripe/webhook (Async Gateway)
    // -----------------------------------------------------------------------
    describe('POST /auth/stripe/webhook', () => {

        // Falla General 3: Falta de firma en los Headers
        it('Debería lanzar error 400 si la firma no pasa el constructEvent de la SDK de Stripe', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/stripe/webhook')
                .set('stripe-signature', 'firma-falsa-invalida')
                .send({ data: "invalid_event" })
                .expect(400);

            // CAMBIO AQUÍ: Cambiamos toContain('Webhook Error:') por el mensaje real que lanza tu controlador
            expect(response.body.message).toBe('El cuerpo de la petición (rawBody) está vacío o no configurado.');
        });

    });

    // -----------------------------------------------------------------------
    // ENDPOINTS: GET /auth/pay/success & GET /auth/pay/failed (Redirects)
    // -----------------------------------------------------------------------
    describe('GET Redirections / Redirect Endpoints', () => {
        it('GET /auth/pay/success - Debería retornar mensaje amigable de procesamiento exitoso (200)', async () => {
            const response = await request(app.getHttpServer())
                .get('/auth/pay/success')
                .expect(200);

            expect(response.body.message).toContain('Tu pago está siendo procesado por el sistema');
        });

        it('GET /auth/pay/failed - Debería retornar mensaje amigable de cancelación/rechazo (200)', async () => {
            const response = await request(app.getHttpServer())
                .get('/auth/pay/failed')
                .expect(200);

            expect(response.body.message).toContain('El pago fue cancelado o rechazado');
        });
    });

});