import { expect, describe, it, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MetricsService } from '../src/logs/services/metrics.services';

let app: INestApplication;
const berertoken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzMwNmQ2Yi1jZDJlLTRlZjMtYTdiMS1lZmQwOGVhN2U4Y2EiLCJlbWFpbCI6ImNhcmxvcy5ub2d1ZXpAdHJhemEuZGlnaXRhbCIsImlhdCI6MTc4MjI0OTA3NywiZXhwIjoxNzgyODUzODc3fQ.9R3hB_NXQIuvgE5ouI_-rrcdBQFhSpBG77LeJWq1PrU";

const mockMetricsService: Record<string, any> = {
    getAiPrediction: jest.fn().mockImplementation(() => Promise.resolve({
        meterId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        prediction: {
            estimatedRechargeDate: "2026-07-15T18:30:00.000Z",
            daysRemaining: 19,
            estimatedConsumptionRate: "1.25 m³/día",
            confidenceScore: 0.92
        }
    })),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(MetricsService).useValue(mockMetricsService).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

beforeEach(() => {
    mockMetricsService.getAiPrediction.mockReset();
    mockMetricsService.getAiPrediction.mockImplementation(() => Promise.resolve({
        meterId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        prediction: {
            estimatedRechargeDate: "2026-07-15T18:30:00.000Z",
            daysRemaining: 19,
            estimatedConsumptionRate: "1.25 m³/día",
            confidenceScore: 0.92
        }
    }));
});

afterAll(async () => {
    await app.close();
});

// ─────────────────────────────────────────────
// POST /logs/ai
// ─────────────────────────────────────────────
describe('Metrics: AI Predictions', () => {
    const validMeterId = '3bc8e162-4217-4934-bc2c-5645367b1201';

    describe('POST /logs/ai', () => {
        it('Debería retornar la predicción de IA exitosamente con código 201', async () => {
            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send({ meterId: validMeterId })
                .expect(201);

            expect(response.body).toHaveProperty('meterId', validMeterId);
            expect(response.body).toHaveProperty('prediction');

            const prediction = response.body.prediction;
            expect(prediction).toHaveProperty('estimatedRechargeDate');
            expect(prediction).toHaveProperty('daysRemaining', 19);
            expect(prediction).toHaveProperty('estimatedConsumptionRate');
            expect(prediction).toHaveProperty('confidenceScore', 0.92);
        });

        it('Debería retornar 200 si el medidor tiene historial insuficiente para la predicción', async () => {
            mockMetricsService.getAiPrediction.mockResolvedValueOnce({
                meterId: validMeterId,
                prediction: null,
                message: "Historial de consumo insuficiente para calcular una predicción confiable. Se requieren al menos 7 días de telemetría."
            });

            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send({ meterId: validMeterId })
                .expect(200);

            expect(response.body.prediction).toBeNull();
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('Historial de consumo insuficiente');
        });

        it('Debería lanzar 400 Bad Request si el meterId no es un UUID válido', async () => {
            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send({ meterId: 'id-invalido-123' })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Bad Request');
            expect(response.body.message).toContain('meterId must be a UUID');
        });

        it('Debería lanzar 404 Not Found si el medidor no existe o no pertenece al usuario', async () => {
            mockMetricsService.getAiPrediction.mockRejectedValueOnce(
                new NotFoundException('El medidor solicitado no existe o no está asignado a este usuario.')
            );

            const nonExistentMeterId = '00000000-0000-4000-a000-000000000000';

            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send({ meterId: nonExistentMeterId })
                .expect(404);

            expect(response.body.message).toBe('El medidor solicitado no existe o no está asignado a este usuario.');
        });

        it('Debería lanzar 403 Forbidden si el usuario viola el control de acceso (simulado)', async () => {
            mockMetricsService.getAiPrediction.mockRejectedValueOnce(
                new ForbiddenException('You do not have access to this meter')
            );

            const unownedMeterId = '11111111-2222-4333-b444-555555555555';

            await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send({ meterId: unownedMeterId })
                .expect(403);
        });

        it('Debería lanzar 401 Unauthorized si no se proporciona el token de acceso', async () => {
            await request(app.getHttpServer())
                .post('/logs/ai')
                .send({ meterId: validMeterId })
                .expect(401);
        });
    });
});