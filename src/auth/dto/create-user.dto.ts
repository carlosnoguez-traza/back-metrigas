import { IsEmail, IsString, MinLength, IsNumber, Min, Length } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email!: string;

    @IsString()
    username!: string;

    @IsNumber()
    @Min(0)
    age!: number;

    @IsString()
    @MinLength(8)
    pwd!: string;
}

export class VerifyCodeDto {
    @IsEmail()
    email!: string;

    @IsString()
    @Length(6, 6) // El código debe ser de exactamente 6 caracteres
    code!: string;
}

export class LoginDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    pwd!: string;
}

