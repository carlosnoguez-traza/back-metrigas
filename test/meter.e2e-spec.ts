import { expect, describe, it, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LogsService } from '../src/logs/logs.service'; // Asegúrate de apuntar a la ruta real de tu servicio

let app: INestApplication;
const berertoken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzMwNmQ2Yi1jZDJlLTRlZjMtYTdiMS1lZmQwOGVhN2U4Y2EiLCJlbWFpbCI6ImNhcmxvcy5ub2d1ZXpAdHJhemEuZGlnaXRhbCIsImlhdCI6MTc4MjI0OTA3NywiZXhwIjoxNzgyODUzODc3fQ.9R3hB_NXQIuvgE5ouI_-rrcdBQFhSpBG77LeJWq1PrU";

const mockLogsService: Record<string, any> = {
    // Se mapea la función que procesa la IA (ej. processAiLog)
    processAiLog: jest.fn().mockImplementation(() => Promise.resolve({
        ok: true,
        message: 'Análisis de IA generado correctamente',
    })),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(LogsService).useValue(mockLogsService).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

beforeEach(() => {
    mockLogsService.processAiLog.mockReset();
    mockLogsService.processAiLog.mockImplementation(() => Promise.resolve({
        ok: true,
        message: 'Análisis de IA generado correctamente',
    }));
});

afterAll(async () => { await app.close(); });

// ─────────────────────────────────────────────
// POST /logs/ai
// ─────────────────────────────────────────────
describe('Logs: AI Processing', () => {
    describe('POST /logs/ai', () => {
        it('Debería procesar logs con IA exitosamente (201)', async () => {
            const body = {
                meterId: "f211ed18-05da-4656-80b0-25f801189e02"
            };

            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(body)
                .expect(201);

            expect(response.body).toHaveProperty('ok', true);
            expect(response.body).toHaveProperty('message', 'Análisis de IA generado correctamente');
        });

        it('Debería lanzar 400 si el meterId no es un UUID válido o está ausente', async () => {
            mockLogsService.processAiLog.mockRejectedValueOnce(
                new BadRequestException('El meterId debe ser un UUID válido'),
            );

            const invalidBody = {
                meterId: "id-invalido-123"
            };

            const response = await request(app.getHttpServer())
                .post('/logs/ai')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(invalidBody)
                .expect(400);

            expect(response.body).toHaveProperty('statusCode', 400);
        });

        it('Debería lanzar 401 si no se proporciona el token Bearer', async () => {
            const body = {
                meterId: "f211ed18-05da-4656-80b0-25f801189e02"
            };

            await request(app.getHttpServer())
                .post('/logs/ai')
                .send(body)
                .expect(401);
        });
    });
});