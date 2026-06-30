import { IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DeleteMeterParamsDto {
    @ApiProperty({ description: 'ID único del medidor a eliminar', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    @IsUUID('4', { message: 'meterId debe ser un UUID v4 válido' })
    meterId!: string;
}