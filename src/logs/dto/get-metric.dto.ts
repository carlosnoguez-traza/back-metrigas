import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMetricDto {
    @IsUUID()
    meterId!: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 24; // meses por página
}