import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePwdUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ example: 'correo asociado al usuario', description: 'Correo electrónico del usuario' })
    email!: string;

    @ApiProperty({ example: 'nueva_contraseña123', description: 'Nueva contraseña del usuario' })
    pwd!: string;
}

export class UpdateMailUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ example: 'correo asociado al usuario', description: 'Correo electrónico del usuario' })
    email!: string;
}
