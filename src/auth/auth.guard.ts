import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
    // Inyectamos el JwtService de NestJS
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Token de acceso no proporcionado');
        }

        try {
            // Verificamos el token (Nest automáticamente sabe que expira en 7 días por la config del módulo)
            const payload = await this.jwtService.verifyAsync(token);

            // Súper importante: Inyectamos los datos del usuario (id y email) en el objeto Request
            request['user'] = payload;
        } catch (error) {
            throw new UnauthorizedException('Token inválido o expirado');
        }

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}