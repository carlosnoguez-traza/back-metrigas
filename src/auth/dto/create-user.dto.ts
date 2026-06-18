import { IsEmail, IsString, MinLength, IsNumber, Min } from 'class-validator';

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
    password!: string;

    //@IsString()
    //stripeToken!: string;
}

