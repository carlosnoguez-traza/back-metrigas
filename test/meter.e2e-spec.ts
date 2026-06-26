import { expect, describe, it, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MetersService } from '../src/meters/meters.service';

let app: INestApplication;
const berertoken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzMwNmQ2Yi1jZDJlLTRlZjMtYTdiMS1lZmQwOGVhN2U4Y2EiLCJlbWFpbCI6ImNhcmxvcy5ub2d1ZXpAdHJhemEuZGlnaXRhbCIsImlhdCI6MTc4MjI0OTA3NywiZXhwIjoxNzgyODUzODc3fQ.9R3hB_NXQIuvgE5ouI_-rrcdBQFhSpBG77LeJWq1PrU";

const mockMetersService: Record<string, any> = {
    // Se mapea 'migrate' con el nombre real del service: bulkUpsertMeters
    bulkUpsertMeters: jest.fn().mockImplementation(() => Promise.resolve({
        ok: true,
        message: 'Medidor creado correctamente',
    })),
    // Se mapea 'update' con el nombre real del service: createMeter
    createMeter: jest.fn().mockImplementation(() => Promise.resolve({
        ok: true,
        message: 'Medidor creado correctamente',
    })),
    // Se mapea 'findAll' con el nombre real del service: getMetersByOwner
    getMetersByOwner: jest.fn().mockImplementation(() => Promise.resolve([
        {
            id: '3bc8e162-4217-4934-bc2c-5645367b1201',
            metername: 'Medidor Cocina Principal',
            capacity: 15.5,
            ownerid: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
        },
        {
            id: '7da9f213-9832-4112-af44-239487cba492',
            metername: 'Medidor Calentador Patio',
            capacity: 40.0,
            ownerid: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
        },
    ])),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(MetersService).useValue(mockMetersService).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

beforeEach(() => {
    mockMetersService.bulkUpsertMeters.mockReset();
    mockMetersService.bulkUpsertMeters.mockImplementation(() => Promise.resolve({
        ok: true,
        message: 'Medidor creado correctamente',
    }));

    mockMetersService.createMeter.mockReset();
    mockMetersService.createMeter.mockImplementation(() => Promise.resolve({
        ok: true,
        message: 'Medidor creado correctamente',
    }));

    mockMetersService.getMetersByOwner.mockReset();
    mockMetersService.getMetersByOwner.mockImplementation(() => Promise.resolve([
        {
            id: '3bc8e162-4217-4934-bc2c-5645367b1201',
            metername: 'Medidor Cocina Principal',
            capacity: 15.5,
            ownerid: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
        },
    ]));
});

afterAll(async () => { await app.close(); });

// ─────────────────────────────────────────────
// POST /meters/migrate
// ─────────────────────────────────────────────
describe('Meters: Migrate', () => {
    describe('POST /meters/migrate', () => {
        it('Debería sincronizar medidores exitosamente (201)', async () => {
            const body = [
                {
                    id: '3bc8e162-4217-4934-bc2c-5645367b1201',
                    metername: 'Medidor Cocina Principal',
                    capacity: '15.5',
                    ownerId: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
                },
                {
                    id: '7da9f213-9832-4112-af44-239487cba492',
                    metername: 'Medidor Calentador Patio',
                    capacity: '40.0',
                    ownerId: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
                },
            ];

            const response = await request(app.getHttpServer())
                .post('/meters/migrate')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(body)
                .expect(201);

            expect(response.body).toHaveProperty('ok', true);
            expect(response.body).toHaveProperty('message', 'Medidores sincronizados y actualizados correctamente');
        });

        it('Debería manejar medidores duplicados sin romper la transacción (upsert)', async () => {
            const duplicateBody = [
                {
                    id: '3bc8e162-4217-4934-bc2c-5645367b1201',
                    metername: 'Medidor Cocina Principal',
                    capacity: '15.5',
                    ownerId: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
                },
                {
                    id: '3bc8e162-4217-4934-bc2c-5645367b1201', // mismo id duplicado
                    metername: 'Medidor Cocina Principal',
                    capacity: '15.5',
                    ownerId: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
                },
            ];

            const response = await request(app.getHttpServer())
                .post('/meters/migrate')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(duplicateBody)
                .expect(201);

            expect(response.body).toHaveProperty('ok', true);
        });

        it('Debería lanzar 400 si el body no es un arreglo válido', async () => {
            mockMetersService.bulkUpsertMeters.mockRejectedValueOnce(
                new BadRequestException('El body debe ser un arreglo de medidores'),
            );

            const response = await request(app.getHttpServer())
                .post('/meters/migrate')
                .set('Authorization', `Bearer ${berertoken}`)
                .send({ metername: 'Solo un objeto' })
                .expect(400);

            expect(response.body).toHaveProperty('statusCode', 400);
        });

        it('Debería lanzar 401 si no se proporciona token', async () => {
            await request(app.getHttpServer())
                .post('/meters/migrate')
                .send([])
                .expect(401);
        });
    });
});

// ─────────────────────────────────────────────
// PUT /meters
// ─────────────────────────────────────────────
describe('Meters: Update', () => {
    describe('PUT /meters', () => {
        it('Debería actualizar un medidor exitosamente (200)', async () => {
            const body = {
                id: '7da9f213-9832-4112-af44-239487cba423',
                metername: 'chris',
                capacity: '4200.0',
                ownerId: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
            };

            const response = await request(app.getHttpServer())
                .put('/meters')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(body)
                .expect(200);

            expect(response.body).toHaveProperty('ok', true);
            expect(response.body).toHaveProperty('message', 'Medidor creado correctamente');
        });

        it('Debería lanzar 404 si el medidor no existe', async () => {
            mockMetersService.createMeter.mockRejectedValueOnce(
                new NotFoundException('El medidor solicitado no existe o no está asignado a este usuario.'),
            );

            const body = {
                id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                metername: 'Inexistente',
                capacity: '10.0',
                ownerId: 'c7306d6b-cd2e-4ef3-a7b1-efd08ea7e8ca',
            };

            const response = await request(app.getHttpServer())
                .put('/meters')
                .set('Authorization', `Bearer ${berertoken}`)
                .send(body)
                .expect(404);

            expect(response.body.message).toContain('El medidor solicitado no existe o no está asignado a este usuario.');
        });

        it('Debería lanzar 401 si no se proporciona token', async () => {
            await request(app.getHttpServer())
                .put('/meters')
                .send({})
                .expect(401);
        });
    });
});

// ─────────────────────────────────────────────
// GET /meters
// ─────────────────────────────────────────────
describe('Meters: Get All', () => {
    describe('GET /meters', () => {
        it('Debería retornar la lista de medidores del usuario (200)', async () => {
            const response = await request(app.getHttpServer())
                .get('/meters')
                .set('Authorization', `Bearer ${berertoken}`)
                .expect(200);

            expect(response.body).toHaveProperty('ok', true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('metername');
            expect(response.body.data[0]).toHaveProperty('capacity');
        });

        it('Debería retornar un arreglo vacío si el usuario no tiene medidores (200)', async () => {
            mockMetersService.getMetersByOwner.mockResolvedValueOnce([]);

            const response = await request(app.getHttpServer())
                .get('/meters')
                .set('Authorization', `Bearer ${berertoken}`)
                .expect(200);

            expect(response.body).toHaveProperty('ok', true);
            expect(response.body.data).toEqual([]);
        });

        it('Debería lanzar 401 si no se proporciona token', async () => {
            await request(app.getHttpServer())
                .get('/meters')
                .expect(401);
        });
    });
});