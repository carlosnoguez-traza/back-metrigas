import { expect, describe, it, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LogsService } from '../src/logs/logs.service';

let app: INestApplication;
const berertoken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzMwNmQ2Yi1jZDJlLTRlZjMtYTdiMS1lZmQwOGVhN2U4Y2EiLCJlbWFpbCI6ImNhcmxvcy5ub2d1ZXpAdHJhemEuZGlnaXRhbCIsImlhdCI6MTc4MjI0OTA3NywiZXhwIjoxNzgyODUzODc3fQ.9R3hB_NXQIuvgE5ouI_-rrcdBQFhSpBG77LeJWq1PrU";

// CORREGIDO: Se cambia 'getAiPrediction' por el método real que invoca el controlador: 'predictRecharge'
const mockAiPredictService: Record<string, any> = {
    predictRecharge: jest.fn().mockImplementation(() => Promise.resolve({
        meterId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        prediction: {
            estimatedRechargeDate: '2026-07-15T18:30:00.000Z',
            daysRemaining: 19,
            estimatedConsumptionRate: '1.25 m³/día',
            confidenceScore: 0.92
        }
    })),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(LogsService).useValue(mockAiPredictService).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

beforeEach(() => {
    // CORREGIDO: Resetear e implementar sobre el método correcto
    mockAiPredictService.predictRecharge.mockReset();
    mockAiPredictService.predictRecharge.mockImplementation(() => Promise.resolve({
        meterId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        prediction: {
            estimatedRechargeDate: '2026-07-15T18:30:00.000Z',
            daysRemaining: 19,
            estimatedConsumptionRate: '1.25 m³/día',
            confidenceScore: 0.92
        }
    }));
});

afterAll(async () => { await app.close(); });

// ─────────────────────────────────────────────
// POST /logs/ai
// ─────────────────────────────────────────────
describe('Logs: AI Prediction', () => {
    describe('POST /logs/ai', () => {

        it('Debería generar la predicción con éxito (201)', async () => {
            const body = {
                meterId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
            };

            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(body)
                .expect(201);

            expect(response.body).toHaveProperty('meterId', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
            expect(response.body).toHaveProperty('prediction');
            expect(response.body.prediction).toHaveProperty('estimatedRechargeDate', '2026-07-15T18:30:00.000Z');
            expect(response.body.prediction).toHaveProperty('daysRemaining', 19);
            expect(response.body.prediction).toHaveProperty('estimatedConsumptionRate', '1.25 m³/día');
            expect(response.body.prediction).toHaveProperty('confidenceScore', 0.92);
        });

        it('Debería retornar un caso 200 si los datos históricos son insuficientes para la IA', async () => {
            // CORREGIDO: Sobrescribir el comportamiento en 'predictRecharge'
            mockAiPredictService.predictRecharge.mockResolvedValueOnce({
                meterId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                prediction: null,
                message: 'Historial de consumo insuficiente para calcular una predicción confiable. Se requieren al menos 7 días de telemetría.'
            });

            const body = {
                meterId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
            };

            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(body)
                .expect(201);

            expect(response.body).toHaveProperty('meterId', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
            expect(response.body.prediction).toBeNull();
            expect(response.body).toHaveProperty('message', 'Historial de consumo insuficiente para calcular una predicción confiable. Se requieren al menos 7 días de telemetría.');
        });

        it('Debería lanzar 400 Bad Request si el meterId no es un UUID v4 válido', async () => {
            const body = {
                meterId: 'id-invalido-123'
            };

            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(body)
                .expect(400);

            expect(response.body).toHaveProperty('statusCode', 400);
            expect(response.body.message).toContain('meterId must be a UUID');
            expect(response.body).toHaveProperty('error', 'Bad Request');
        });

        it('Debería lanzar 404 Not Found si el medidor no existe o no pertenece al usuario', async () => {
            // CORREGIDO: Forzar el rechazo simulado usando el nombre correcto del método
            mockAiPredictService.predictRecharge.mockRejectedValueOnce(
                new NotFoundException('El medidor solicitado no existe o no está asignado a este usuario.'),
            );

            const body = {
                meterId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
            };

            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(body)
                .expect(404);

            expect(response.body).toHaveProperty('statusCode', 404);
            expect(response.body.message).toContain('El medidor solicitado no existe o no está asignado a este usuario.');
            expect(response.body).toHaveProperty('error', 'Not Found');
        });

        it('Debería lanzar 401 si no se proporciona el token de autenticación (Bearer Token)', async () => {
            const body = {
                meterId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
            };

            await request(app.getHttpServer())
                .post('/logs/ai')
                .send(body)
                .expect(401);
        });

    });
});