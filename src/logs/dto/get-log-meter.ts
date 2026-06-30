import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetLogByMeterDto {
    @ApiProperty({ description: 'UUID del medidor a consultar', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @IsUUID('4', { message: 'El id debe ser un UUID v4 válido' })
    id!: string;
}