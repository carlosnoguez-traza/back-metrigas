import { expect, describe, it, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/signup (POST) -> Happy Path', async () => {
    const validBody = {
      email: 'carlos.noguez@traza.digital',
      username: 'memin_pinguin122',
      age: 30,
      pwd: 'TuContraseña123!'
    };

    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(validBody);

    expect(response.status).toBe(201);

    const body = response.body;

    expect(body).toHaveProperty('token');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(validBody.email);
    expect(body.user.username).toBe(validBody.username);

    expect(body).not.toHaveProperty('pwd');
  });
});

