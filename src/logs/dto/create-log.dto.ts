import {
    IsNumber,
    IsString,
    IsOptional,
    Min,
    Max,
    IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLogDto {
    @IsNumber({ allowInfinity: false, allowNaN: false })
    @Type(() => Number)
    @Min(0, { message: 'currentPercentage must not be a negative number' })
    @Max(100, { message: 'currentPercentage must not exceed 100' })
    currentPercentage!: number;

    @IsOptional()
    @IsString()
    capacity?: string;

    @IsUUID('4', { message: 'meterId must be a valid UUID' })
    meterId!: string;

    // meditionDate NO se recibe del cliente, se asigna en el servidor
}