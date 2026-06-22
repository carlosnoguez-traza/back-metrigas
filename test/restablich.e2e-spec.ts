import { expect, describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

let app: INestApplication;

const mockAuthService: Record<string, any> = {
    checkEmailPwd: jest.fn().mockImplementation(() => Promise.resolve({ message: 'Código enviado al correo electrónico' })),
    updatePwd: jest.fn().mockImplementation(() => Promise.resolve({ message: 'Contraseña actualizada con éxito' })),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AuthService).useValue(mockAuthService).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

afterAll(async () => { await app.close(); });

describe('Authentication: Restablish Password', () => {
    describe('GET /auth/checkemailpwd/:email', () => {
        it('Debería enviar el código exitosamente (200 OK)', async () => {
            const email = "carlos.noguez@traza.digital";
            await request(app.getHttpServer()).get(`/auth/checkemailpwd/${email}`).expect(200);
        });

        it('Debería lanzar un error 404 si el correo no está registrado', async () => {
            mockAuthService.checkEmailPwd.mockRejectedValueOnce(new NotFoundException('Correo no registrado'));
            await request(app.getHttpServer()).get(`/auth/checkemailpwd/no.existe@traza.digital`).expect(404);
        });
    });

    describe('POST /auth/checkemailpwd', () => {
        it('Debería actualizar la contraseña exitosamente (201)', async () => {
            const resetDto = { email: "carlos.noguez@traza.digital", code: "974578", pwd: "12345678" };
            await request(app.getHttpServer()).post('/auth/checkemailpwd').send(resetDto).expect(201);
        });
    });
});