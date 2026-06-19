import { expect, describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module'; // Ajusta la ruta a tu AppModule
import { AuthService } from '../src/auth/auth.service'; // Ajusta la ruta a tu servicio


describe('Auth Validation (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    // Usamos 'as any' o una firma de función explícita para evitar el conflicto con 'never'
    signUp: jest.fn().mockImplementation(() =>
      Promise.resolve({
        message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.',
      })
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Reemplazamos el servicio real por nuestro mock
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Importante: Si usas ValidationPipe en tu main.ts, 
    // debes ponerlo aquí también para que valide los DTOs en el test.
    app.useGlobalPipes(new ValidationPipe());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('Debería registrar un usuario exitosamente (201)', async () => {
      const signupDto = {
        email: "carlos.noguez@traza.digital",
        username: "memin_pinguin122",
        age: 30,
        pwd: "TuContraseña123!"
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      // Validamos que la respuesta sea exactamente la esperada
      expect(response.body).toEqual({
        message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.',
      });

      // Verificamos que el método del servicio haya sido llamado con los datos correctos
      expect(mockAuthService.signUp).toHaveBeenCalledWith(signupDto);
    });

    it('Debería lanzar un error 400 si el body está incompleto o es inválido', async () => {
      const badSignupDto = {
        email: 'email-invalido', // Email mal formateado
        username: 'Alejandro',
        // falta age y pwd
      };

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(badSignupDto)
        .expect(400); // NestJS responderá automáticamente con 400 gracias al ValidationPipe
    });
  });
});