import { expect, describe, it, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MetricsService } from '../src/logs/services/metrics.services';

let app: INestApplication;
const berertoken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzMwNmQ2Yi1jZDJlLTRlZjMtYTdiMS1lZmQwOGVhN2U4Y2EiLCJlbWFpbCI6ImNhcmxvcy5ub2d1ZXpAdHJhemEuZGlnaXRhbCIsImlhdCI6MTc4MjI0OTA3NywiZXhwIjoxNzgyODUzODc3fQ.9R3hB_NXQIuvgE5ouI_-rrcdBQFhSpBG77LeJWq1PrU";

const mockMetricsService: Record<string, any> = {
    getMonthlyMetrics: jest.fn().mockImplementation(() => Promise.resolve({
        month: 6,
        year: 2026,
        totalConsumption: 45.0,
        averagePercentage: 62.5,
        standardDeviation: 16.45,
        lowerBound: 46.05,
        upperBound: 78.95,
        activeDays: 3,
        logs: [
            { date: "2026-06-01T08:00:00Z", percentage: 80 },
            { date: "2026-06-01T20:00:00Z", percentage: 75 },
            { date: "2026-06-15T10:00:00Z", percentage: 60 },
            { date: "2026-06-30T18:00:00Z", percentage: 35 }
        ],
        chartData: [
            { day: 1, value: 77.5 },
            { day: 15, value: 60.0 },
            { day: 30, value: 35.0 }
        ],
        outliers: [
            { date: "2026-06-01T08:00:00Z", percentage: 80 },
            { date: "2026-06-30T18:00:00Z", percentage: 35 }
        ],
        message: null
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
    mockMetricsService.getMonthlyMetrics.mockReset();
    mockMetricsService.getMonthlyMetrics.mockImplementation(() => Promise.resolve({
        month: 6,
        year: 2026,
        totalConsumption: 45.0,
        averagePercentage: 62.5,
        standardDeviation: 16.45,
        lowerBound: 46.05,
        upperBound: 78.95,
        activeDays: 3,
        logs: [
            { date: "2026-06-01T08:00:00Z", percentage: 80 },
            { date: "2026-06-01T20:00:00Z", percentage: 75 },
            { date: "2026-06-15T10:00:00Z", percentage: 60 },
            { date: "2026-06-30T18:00:00Z", percentage: 35 }
        ],
        chartData: [
            { day: 1, value: 77.5 },
            { day: 15, value: 60.0 },
            { day: 30, value: 35.0 }
        ],
        outliers: [
            { date: "2026-06-01T08:00:00Z", percentage: 80 },
            { date: "2026-06-30T18:00:00Z", percentage: 35 }
        ],
        message: null
    }));
});

afterAll(async () => {
    await app.close();
});

// ─────────────────────────────────────────────
// POST /logs/monthly
// ─────────────────────────────────────────────
describe('Metrics: Get Monthly Aggregates', () => {
    const validBody = {
        meterId: "3bc8e162-4217-4934-bc2c-5645367b1201",
        month: 6,
        year: 2026
    };

    describe('POST /logs/monthly', () => {
        it('Debería retornar las métricas completas del mes solicitado con código 201', async () => {
            const response = await request(app.getHttpServer())
                .post('/logs/monthly')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(validBody)
                .expect(201);

            // Verificaciones de propiedades de la respuesta según tu ejemplo
            expect(response.body).toHaveProperty('month', 6);
            expect(response.body).toHaveProperty('year', 2026);
            expect(response.body).toHaveProperty('totalConsumption');
            expect(response.body).toHaveProperty('averagePercentage');
            expect(response.body).toHaveProperty('activeDays');

            // Estructura de logs
            expect(response.body.logs).toBeInstanceOf(Array);
            expect(response.body.logs[0]).toHaveProperty('date');
            expect(response.body.logs[0]).toHaveProperty('percentage');

            // Estructura de gráfica mensual
            expect(response.body.chartData).toBeInstanceOf(Array);
            expect(response.body.chartData[0]).toHaveProperty('day');
            expect(response.body.chartData[0]).toHaveProperty('value');
        });

        it('Debería retornar 201 con logs vacíos y mensaje aclaratorio si el mes no contiene registros', async () => {
            mockMetricsService.getMonthlyMetrics.mockResolvedValueOnce({
                month: 1,
                year: 2024,
                totalConsumption: 0,
                averagePercentage: 0,
                standardDeviation: 0,
                lowerBound: 0,
                upperBound: 0,
                activeDays: 0,
                logs: [],
                chartData: [],
                outliers: [],
                message: 'Sin datos para este periodo'
            });

            const emptyMonthBody = { ...validBody, month: 1, year: 2024 };

            const response = await request(app.getHttpServer())
                .post('/logs/monthly')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(emptyMonthBody)
                .expect(201);

            expect(response.body.logs).toEqual([]);
            expect(response.body.chartData).toEqual([]);
            expect(response.body.message).toBe('Sin datos para este periodo');
        });

        it('Debería lanzar 400 Bad Request si el mes está fuera de rango (mes = 13)', async () => {
            // Suponiendo que tu ValidationPipe o Controller lance BadRequest al validar el DTO
            mockMetricsService.getMonthlyMetrics.mockRejectedValueOnce(
                new BadRequestException('El mes debe estar entre 1 y 12')
            );

            const invalidMonthBody = { ...validBody, month: 13 };

            await request(app.getHttpServer())
                .post('/logs/monthly')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(invalidMonthBody)
                .expect(400);
        });

        it('Debería lanzar 400 Bad Request si se solicita un año o periodo futuro', async () => {
            mockMetricsService.getMonthlyMetrics.mockRejectedValueOnce(
                new BadRequestException('No se pueden consultar periodos futuros')
            );

            const futureYearBody = { ...validBody, year: 2030 };

            await request(app.getHttpServer())
                .post('/logs/monthly')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(futureYearBody)
                .expect(400);
        });

        it('Debería retornar 403 Forbidden si el usuario no es dueño del medidor', async () => {
            mockMetricsService.getMonthlyMetrics.mockRejectedValueOnce(
                new ForbiddenException('You do not have access to this meter')
            );

            const unownedMeterBody = { ...validBody, meterId: '7da9f213-9832-4112-af44-239487cba492' };

            await request(app.getHttpServer())
                .post('/logs/monthly')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(unownedMeterBody)
                .expect(403);
        });

        it('Debería lanzar 401 Unauthorized si no se proporciona el token de acceso', async () => {
            await request(app.getHttpServer())
                .post('/logs/monthly')
                .send(validBody)
                .expect(401);
        });
    });
});