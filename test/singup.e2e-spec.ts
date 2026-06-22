import { expect, describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

let app: INestApplication;

const mockAuthService = {
    signUp: jest.fn().mockImplementation(() => Promise.resolve({ message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.' })),
    verifyCode: jest.fn().mockImplementation(() => Promise.resolve({ message: 'Cuenta verificada con éxito. Ya puedes iniciar sesión.' })),
};

beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AuthService).useValue(mockAuthService).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
});

afterAll(async () => { await app.close(); });

describe('Authentication: Signup & Verification', () => {
    describe('POST /auth/signup', () => {
        it('Debería registrar un usuario exitosamente (201)', async () => {
            const signupDto = { email: "carlos.noguez@traza.digital", username: "memin_pinguin122", age: 30, pwd: "TuContraseña123!" };
            const response = await request(app.getHttpServer()).post('/auth/signup').send(signupDto).expect(201);
            expect(response.body).toEqual({ message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.' });
        });

        it('Debería lanzar un error 400 si el body está incompleto o es inválido', async () => {
            const badSignupDto = { email: 'email-invalido', username: 'Alejandro' };
            await request(app.getHttpServer()).post('/auth/signup').send(badSignupDto).expect(400);
        });
    });

    describe('POST /auth/verify', () => {
        it('Debería lanzar error 400 si el código no tiene el formato correcto', async () => {
            const badVerifyDto = { email: "carlos.noguez@traza.digital", code: "123" };
            await request(app.getHttpServer()).post('/auth/verify').send(badVerifyDto).expect(400);
        });
    });
});