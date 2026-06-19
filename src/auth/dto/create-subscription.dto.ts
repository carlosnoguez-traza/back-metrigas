import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
    @ApiProperty({
        description: 'El ID de la tarifa/precio creado en el dashboard de Stripe',
        example: 'price_1QJ...',
        required: false,
    })
    @IsString({ message: 'El priceId debe ser una cadena de texto válida.' })
    @IsOptional()
    @Matches(/^price_[a-zA-Z0-9]+$/, {
        message: 'El formato del priceId no parece ser un ID válido de Stripe (debe empezar con "price_").',
    })
    priceId?: string;
}