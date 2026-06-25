import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetMetricDto {
    @ApiProperty({ description: 'uuid del medidor asociado' })
    @IsUUID()
    meterId!: string;

    @ApiProperty({ example: 1, description: 'Numero maximo de paginas si existen demasiados registros' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiProperty({ example: 24, description: 'Numero de meses por pagina' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 24; // meses por página
}

export class MonthMeterDto {
    @ApiProperty({ description: 'uuid del medidor asociado' })
    @IsUUID()
    meterId!: string;

    @ApiProperty({ example: 6, description: 'Mes (1-12)' })
    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    month!: number;

    @ApiProperty({ example: 2026, description: 'Año' })
    @IsInt()
    @Min(2000)
    @Max(2100)
    @Type(() => Number)
    year!: number;
}