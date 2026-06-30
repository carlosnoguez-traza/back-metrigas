import {
    IsNumber,
    IsString,
    IsOptional,
    Min,
    Max,
    IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLogDto {
    @ApiProperty({ description: 'Porcentaje actual de carga/nivel del medidor (0-100)', example: 75.5, minimum: 0, maximum: 100 })
    @IsNumber({ allowInfinity: false, allowNaN: false })
    @Type(() => Number)
    @Min(0, { message: 'currentPercentage must not be a negative number' })
    @Max(100, { message: 'currentPercentage must not exceed 100' })
    currentPercentage!: number;

    @ApiPropertyOptional({ description: 'Capacidad del medidor (opcional)', example: '150.5' })
    @IsOptional()
    @IsString()
    capacity?: string;

    @ApiProperty({ description: 'UUID del medidor asociado a esta lectura', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
    @IsUUID('4', { message: 'meterId must be a valid UUID' })
    meterId!: string;
}