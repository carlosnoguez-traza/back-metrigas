import { expect, describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

describe('Auth E2E Test Suite', () => {
  let app: INestApplication;

  // Centralizamos todos los mocks del servicio en un solo objeto dinámico
  const mockAuthService: Record<string, any> = {
    signUp: jest.fn().mockImplementation(() =>
      Promise.resolve({
        message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.',
      })
    ),
    verifyCode: jest.fn().mockImplementation(() =>
      Promise.resolve({
        message: 'Cuenta verificada con éxito. Ya puedes iniciar sesión.',
      })
    ),
    login: jest.fn().mockImplementation(() =>
      Promise.resolve({
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YjI5ZTM5My04ZDkxLTRhZDItOTRmMC03OWY0NzRkYWQ0NDUiLCJlbWFpbCI6ImNhcmxvcy5ub2d1ZXpAdHJhemEuZGlnaXq7FYY4_NFM9TsI",
        user: {
          id: "6b29e393-8d91-4ad2-94f0-79f474d45",
          email: "carlos.noguez@traza.digital",
          username: "memin_pinguin122",
          age: 30,
          subscriptionDate: "2026-06-19T23:58:41.443Z"
        }
      })
    ),
    checkEmailPwd: jest.fn().mockImplementation(() =>
      Promise.resolve({
        message: 'Código enviado al correo electrónico'
      })
    ),
    checkEmailPwdVerify: jest.fn().mockImplementation(() =>
      Promise.resolve({
        message: 'Correo verificado con exito'
      })
    ),
    // CORRECCIÓN: Cambiado de resetPassword a updatePwd para alinearse con tu AuthController
    updatePwd: jest.fn().mockImplementation(() =>
      Promise.resolve({
        message: 'Contraseña actualizada con éxito'
      })
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // BLOQUE: SIGNUP
  // ==========================================
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

      expect(response.body).toEqual({
        message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.',
      });

      expect(mockAuthService.signUp).toHaveBeenCalledWith(signupDto);
    });

    it('Debería lanzar un error 400 si el body está incompleto o es inválido', async () => {
      const badSignupDto = {
        email: 'email-invalido',
        username: 'Alejandro',
      };

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(badSignupDto)
        .expect(400);
    });
  });

  // ==========================================
  // BLOQUE: VERIFY
  // ==========================================
  describe('POST /auth/verify', () => {
    it('Debería lanzar error 400 si el código no tiene el formato correcto', async () => {
      const badVerifyDto = {
        email: "carlos.noguez@traza.digital",
        code: "123"
      };

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send(badVerifyDto)
        .expect(400);
    });
  });

  // ==========================================
  // BLOQUE: CHECK EMAIL PWD (GET)
  // ==========================================
  describe('GET /auth/checkemailpwd/:email', () => {
    it('Debería enviar el código exitosamente si el correo existe (200 OK)', async () => {
      const email = "carlos.noguez@traza.digital";

      const response = await request(app.getHttpServer())
        .get(`/auth/checkemailpwd/${email}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Código enviado al correo electrónico'
      });

      expect(mockAuthService.checkEmailPwd).toHaveBeenCalledWith(email);
    });

    it('Debería lanzar un error 404 si el correo no está registrado', async () => {
      mockAuthService.checkEmailPwd.mockRejectedValueOnce(
        new NotFoundException('Correo no registrado')
      );

      const unregisteredEmail = "no.existe@traza.digital";

      const response = await request(app.getHttpServer())
        .get(`/auth/checkemailpwd/${unregisteredEmail}`)
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        message: "Correo no registrado",
        error: "Not Found"
      });
    });
  });

  // ==========================================
  // BLOQUE: CHECK EMAIL PWD (POST)
  // ==========================================
  describe('POST /auth/checkemailpwd', () => {
    it('Debería actualizar la contraseña exitosamente al enviar datos válidos (201)', async () => {
      const resetDto = {
        email: "carlos.noguez@traza.digital",
        code: "974578",
        pwd: "12345678"
      };

      const response = await request(app.getHttpServer())
        .post('/auth/checkemailpwd')
        .send(resetDto)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Contraseña actualizada con éxito'
      });

      expect(mockAuthService.updatePwd).toHaveBeenCalledWith(resetDto);
    });

    it('Debería lanzar un error 400 si el código de verificación es erróneo o expiró', async () => {
      mockAuthService.updatePwd.mockRejectedValueOnce(
        new BadRequestException('Código de verificación inválido')
      );

      const badResetDto = {
        email: "carlos.noguez@traza.digital",
        code: "000000",
        pwd: "12345678"
      };

      const response = await request(app.getHttpServer())
        .post('/auth/checkemailpwd')
        .send(badResetDto)
        .expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        message: "Código de verificación inválido",
        error: "Bad Request"
      });
    });

    it('Debería lanzar un error 400 si el email enviado no es válido (ValidationPipe)', async () => {
      const badResetDto = {
        email: "email-invalido",
        code: "974578",
        pwd: "12345678"
      };

      const response = await request(app.getHttpServer())
        .post('/auth/checkemailpwd')
        .send(badResetDto)
        .expect(400);

      expect(response.body.message).toContain("email must be an email");
    });
  });

  // ==========================================
  // BLOQUE: LOGIN
  // ==========================================
  describe('POST /auth/login', () => {
    it('Debería iniciar sesión exitosamente (201 o 200) y retornar el token con el usuario', async () => {
      const loginDto = {
        email: "carlos.noguez@traza.digital",
        pwd: "TuContraseña123!"
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toEqual({
        id: "6b29e393-8d91-4ad2-94f0-79f474d45",
        email: "carlos.noguez@traza.digital",
        username: "memin_pinguin122",
        age: 30,
        subscriptionDate: "2026-06-19T23:58:41.443Z"
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('Debería lanzar un error 400 si las credenciales son incorrectas', async () => {
      mockAuthService.login.mockRejectedValueOnce(
        new BadRequestException('Correo o contraseña incorrectos')
      );

      const wrongLoginDto = {
        email: "carlos.noguez@traza.digital",
        pwd: "PasswordIncorrecto123!"
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(wrongLoginDto)
        .expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        message: "Correo o contraseña incorrectos",
        error: "Bad Request"
      });
    });

    it('Debería lanzar un error 400 si la contraseña es menor a 8 caracteres (ValidationPipe)', async () => {
      const badLoginDto = {
        email: "carlos.noguez@traza.digital",
        pwd: "123"
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(badLoginDto)
        .expect(400);

      expect(response.body.message).toContain("pwd must be longer than or equal to 8 characters");
    });

    it('Debería lanzar un error 400 si el formato del correo es inválido (ValidationPipe)', async () => {
      const badLoginDto = {
        email: "correo-invalido",
        pwd: "TuContraseña123!"
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(badLoginDto)
        .expect(400);

      expect(response.body.message).toContain("email must be an email");
    });
  });
});