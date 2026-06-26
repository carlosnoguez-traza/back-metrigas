import { expect, describe, it, beforeAll, afterAll, jest, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LogsService } from '../src/logs/logs.service';

let app: INestApplication;

const mockLogsService: Record<string, any> = {
    create: jest.fn().mockImplementation(() => Promise.resolve({
        id: '21e043d7-43c0-470d-a1ed-f6f6ae37fb9e',
        currentPercentage: 75.5,
        meditionDate: '2026-06-24T21:22:20.337Z',
        meterid: '3bc8e162-4217-4934-bc2c-5645367b1201',
    })),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(LogsService).useValue(mockLogsService).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

afterAll(async () => { await app.close(); });

describe('Logs: Create Log', () => {
    describe('POST /logs', () => {
        it('Debería crear un log exitosamente (201)', async () => {
            const createLogDto = {
                currentPercentage: 75.5,
                meterId: '3bc8e162-4217-4934-bc2c-5645367b1201',
            };

            const response = await request(app.getHttpServer())
                .post('/logs')
                .send(createLogDto)
                .expect(201);

            expect(response.body).toHaveProperty('ok', true);
            expect(response.body.data).toMatchObject({
                currentPercentage: 75.5,
                meterid: '3bc8e162-4217-4934-bc2c-5645367b1201',
            });
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('meditionDate');
        });

        it('Debería lanzar un error 401 si el usuario no es premium', async () => {
            mockLogsService.create.mockRejectedValueOnce(
                new UnauthorizedException('El usuario no es premium'),
            );

            const createLogDto = {
                currentPercentage: 75.5,
                meterId: '3bc8e162-4217-4934-bc2c-5645367b1201',
            };

            const response = await request(app.getHttpServer())
                .post('/logs')
                .send(createLogDto)
                .expect(401);

            expect(response.body.message).toBe('El usuario no es premium');
        });

        it('Debería lanzar un error 400 si currentPercentage es negativo', async () => {
            mockLogsService.create.mockRejectedValueOnce(
                new BadRequestException('currentPercentage must not be a negative number'),
            );

            const createLogDto = {
                currentPercentage: -10,
                meterId: '3bc8e162-4217-4934-bc2c-5645367b1201',
            };

            const response = await request(app.getHttpServer())
                .post('/logs')
                .send(createLogDto)
                .expect(400);

            expect(response.body.message).toContain('currentPercentage must not be a negative number');
        });

        it('Debería lanzar un error 400 si currentPercentage supera 100', async () => {
            mockLogsService.create.mockRejectedValueOnce(
                new BadRequestException('currentPercentage must not exceed 100'),
            );

            const createLogDto = {
                currentPercentage: 150,
                meterId: '3bc8e162-4217-4934-bc2c-5645367b1201',
            };

            const response = await request(app.getHttpServer())
                .post('/logs')
                .send(createLogDto)
                .expect(400);

            expect(response.body.message).toContain('currentPercentage must not exceed 100');
        });

        beforeEach(() => {
            mockLogsService.create.mockReset();
            mockLogsService.create.mockImplementation(() => Promise.resolve({
                id: '21e043d7-43c0-470d-a1ed-f6f6ae37fb9e',
                currentPercentage: 75.5,
                meditionDate: '2026-06-24T21:22:20.337Z',
                meterid: '3bc8e162-4217-4934-bc2c-5645367b1201',
            }));
        });

        it('Debería lanzar un error 400 si el meterId no existe', async () => {
            mockLogsService.create.mockRejectedValueOnce(
                new BadRequestException('Invalid data: verify that meterId references an existing meter'),
            );

            const createLogDto = {
                currentPercentage: 50,
                meterId: '3bc8e162-4217-4934-bc2c-5645367b1203',
            };

            const response = await request(app.getHttpServer())
                .post('/logs')
                .send(createLogDto)
                .expect(400);

            expect(response.body.message).toContain('Invalid data: verify that meterId references an existing meter');
        });
    });
});