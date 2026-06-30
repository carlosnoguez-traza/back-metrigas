import { IsString, IsOptional, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMeterDto {
    @ApiProperty({ description: 'ID único del medidor', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    @IsString()
    id!: string;

    @ApiProperty({ description: 'Nombre del medidor', example: 'Medidor Casa Norte' })
    @IsString()
    metername?: string;

    @ApiPropertyOptional({ description: 'Capacidad del medidor (valor numérico en formato string)', example: '150.5' })
    @IsString()
    @IsOptional()
    @Matches(/^[0-9]+(\.[0-9]+)?$/, { message: 'capacity must be a valid number' })
    capacity?: string;

    @ApiProperty({ description: 'ID del usuario propietario del medidor', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    @IsString()
    ownerId!: string;
}