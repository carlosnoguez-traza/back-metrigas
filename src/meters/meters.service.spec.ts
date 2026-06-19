import { Test, TestingModule } from '@nestjs/testing';
import { MetersService } from './meters.service';
import { beforeEach, describe } from 'node:test';

describe('MetersService', () => {
  let service: MetersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetersService],
    }).compile();

    service = module.get<MetersService>(MetersService);
  });


});
