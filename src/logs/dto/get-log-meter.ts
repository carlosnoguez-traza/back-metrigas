import { IsUUID } from 'class-validator';

export class GetLogByMeterDto {
    @IsUUID('4', { message: 'El id debe ser un UUID v4 válido' })
    id!: string;
}