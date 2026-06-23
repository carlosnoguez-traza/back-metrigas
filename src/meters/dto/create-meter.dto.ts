
import { IsString, IsOptional, Matches } from "class-validator";

export class CreateMeterDto {
    @IsString()
    id!: string;

    @IsString()
    metername?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9]+(\.[0-9]+)?$/, { message: 'capacity must be a valid number' })
    capacity?: string;

    @IsString()
    ownerId!: string;
}
