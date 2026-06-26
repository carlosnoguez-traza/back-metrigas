import { expect, describe, it, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MetricsService } from '../src/logs/services/metrics.services';

let app: INestApplication;
const berertoken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzMwNmQ2Yi1jZDJlLTRlZjMtYTdiMS1lZmQwOGVhN2U4Y2EiLCJlbWFpbCI6ImNhcmxvcy5ub2d1ZXpAdHJhemEuZGlnaXRhbCIsImlhdCI6MTc4MjI0OTA3NywiZXhwIjoxNzgyODUzODc3fQ.9R3hB_NXQIuvgE5ouI_-rrcdBQFhSpBG77LeJWq1PrU";

// Mock del servicio adaptado a la firma real de tu método: consultMeters
const mockMetricsService: Record<string, any> = {
    consultMeters: jest.fn().mockImplementation(() => Promise.resolve({
        consumo_total: 450.5,
        promedio_mensual: 37.5,
        max_mensual: 55.0,
        porcentaje_promedio: 72.3,
        fecha_ultimo_log: "2026-06-25T18:30:00.000Z",
        proxima_carga_estimada: "2026-07-15T00:00:00.000Z",
        datos_mensuales: [
            { mes: 5, año: 2026, consumo: 45.2, porcentaje_promedio: 70.5 },
            { mes: 6, año: 2026, consumo: 55.0, porcentaje_promedio: 74.1 }
        ]
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
    mockMetricsService.consultMeters.mockReset();
    mockMetricsService.consultMeters.mockImplementation(() => Promise.resolve({
        consumo_total: 450.5,
        promedio_mensual: 37.5,
        max_mensual: 55.0,
        porcentaje_promedio: 72.3,
        fecha_ultimo_log: "2026-06-25T18:30:00.000Z",
        proxima_carga_estimada: "2026-07-15T00:00:00.000Z",
        datos_mensuales: [
            { mes: 5, año: 2026, consumo: 45.2, porcentaje_promedio: 70.5 },
            { mes: 6, año: 2026, consumo: 55.0, porcentaje_promedio: 74.1 }
        ]
    }));
});

afterAll(async () => {
    await app.close();
});

// ─────────────────────────────────────────────
// GET /logs (Métricas)
// ─────────────────────────────────────────────
describe('Metrics: Get Aggregates', () => {
    const validMeterId = '3bc8e162-4217-4934-bc2c-5645367b1201';

    describe('GET /logs', () => {
        it('Debería retornar las métricas completas del medidor con código 200', async () => {
            const response = await request(app.getHttpServer())
                .get(`/logs?meterId=${validMeterId}&page=1&limit=24`)
                .set('Authorization', `Bearer ${berertoken}`)
                .expect(200);

            expect(response.body).toHaveProperty('ok', true);

            // Las propiedades se evalúan ahora dentro del objeto .data debido a tu controlador
            const data = response.body.data;
            expect(data).toHaveProperty('consumo_total');
            expect(data).toHaveProperty('promedio_mensual');
            expect(data).toHaveProperty('max_mensual');
            expect(data).toHaveProperty('porcentaje_promedio');
            expect(data).toHaveProperty('fecha_ultimo_log');
            expect(data).toHaveProperty('proxima_carga_estimada');

            expect(data.datos_mensuales).toBeInstanceOf(Array);
            expect(data.datos_mensuales[0]).toHaveProperty('mes');
            expect(data.datos_mensuales[0]).toHaveProperty('consumo');
            expect(data.datos_mensuales[0]).toHaveProperty('porcentaje_promedio');
        });

        it('Debería retornar métricas en cero y arrays vacíos si el medidor no registra logs (200)', async () => {
            mockMetricsService.consultMeters.mockResolvedValueOnce({
                consumo_total: 0,
                promedio_mensual: 0,
                max_mensual: 0,
                porcentaje_promedio: 0,
                fecha_ultimo_log: null,
                proxima_carga_estimada: null,
                datos_mensuales: [],
                paginacion: { pagina_actual: 1, total_meses: 0, total_paginas: 0 }
            });

            const response = await request(app.getHttpServer())
                .get(`/logs?meterId=${validMeterId}`)
                .set('Authorization', `Bearer ${berertoken}`)
                .expect(200);

            expect(response.body).toHaveProperty('ok', true);
            expect(response.body.data.consumo_total).toBe(0);
            expect(response.body.data.datos_mensuales).toEqual([]);
        });

        it('Debería retornar 403 Forbidden si el usuario no es el dueño del medidor', async () => {
            mockMetricsService.consultMeters.mockRejectedValueOnce(
                new ForbiddenException('You do not have access to this meter')
            );

            const unownedMeterId = '7da9f213-9832-4112-af44-239487cba492';

            await request(app.getHttpServer())
                .get(`/logs?meterId=${unownedMeterId}`)
                .set('Authorization', `Bearer ${berertoken}`)
                .expect(403);
        });

        it('Debería lanzar 400 Bad Request si no se envía el parámetro meterId', async () => {
            const response = await request(app.getHttpServer())
                .get('/logs')
                .set('Authorization', `Bearer ${berertoken}`)
                .expect(400);
        });

        it('Debería lanzar 401 Unauthorized si no se proporciona el token de acceso', async () => {
            await request(app.getHttpServer())
                .get(`/logs?meterId=${validMeterId}`)
                .expect(401);
        });
    });
});