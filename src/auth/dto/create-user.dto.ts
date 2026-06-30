import { IsEmail, IsString, MinLength, IsNumber, Min, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ example: 'usuario@correo.com', description: 'Correo electrónico del usuario' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'juanperez', description: 'Nombre de usuario' })
    @IsString()
    username!: string;

    @ApiProperty({ example: 25, description: 'Edad del usuario', minimum: 0 })
    @IsNumber()
    @Min(0)
    age!: number;

    @ApiProperty({ example: 'contraseña123', description: 'Contraseña del usuario (mínimo 8 caracteres)', minLength: 8 })
    @IsString()
    @MinLength(8)
    pwd!: string;
}

export class VerifyCodeDto {
    @ApiProperty({ example: 'usuario@correo.com', description: 'Correo electrónico del usuario' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: '123456', description: 'Código de verificación de 6 dígitos enviado al correo' })
    @IsString()
    @Length(6, 6)
    code!: string;
}

export class LoginDto {
    @ApiProperty({ example: 'usuario@correo.com', description: 'Correo electrónico del usuario' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'contraseña123', description: 'Contraseña del usuario', minLength: 8 })
    @IsString()
    @MinLength(8)
    pwd!: string;
}