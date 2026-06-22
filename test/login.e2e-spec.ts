import { expect, describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

let app: INestApplication;

const mockAuthService: Record<string, any> = {
    login: jest.fn().mockImplementation(() => Promise.resolve({
        accessToken: "eyJhbGciOiJIUzI1NiIs...",
        user: { id: "6b29e393", email: "carlos.noguez@traza.digital", username: "memin_pinguin122", age: 30, subscriptionDate: "2026-06-19" }
    })),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AuthService).useValue(mockAuthService).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

afterAll(async () => { await app.close(); });

describe('Authentication: Login', () => {
    describe('POST /auth/login', () => {
        it('Debería iniciar sesión exitosamente (201)', async () => {
            const loginDto = { email: "carlos.noguez@traza.digital", pwd: "TuContraseña123!" };
            const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(201);
            expect(response.body).toHaveProperty('accessToken');
        });

        it('Debería lanzar un error 400 si las credenciales son incorrectas', async () => {
            mockAuthService.login.mockRejectedValueOnce(new BadRequestException('Correo o contraseña incorrectos'));
            const wrongLoginDto = { email: "carlos.noguez@traza.digital", pwd: "PasswordIncorrecto123!" };
            await request(app.getHttpServer()).post('/auth/login').send(wrongLoginDto).expect(400);
        });
    });
});