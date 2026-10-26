import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { Database, InjectDb } from '../../db/db.module';
import { Role, users } from '../../db/schema';
import { ROLES_KEY } from '../decorators/roles.decorator';

export const SESSION_COOKIE = 'mg_session';

/**
 * Protege las rutas del panel de administración.
 * Acepta el token desde la cookie httpOnly (navegador) o el header Authorization (integraciones).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectDb() private readonly db: Database,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Sesión requerida');

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Sesión vencida o inválida');
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.sub),
      columns: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user || !user.active) throw new UnauthorizedException('Usuario inactivo');

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (required?.length && !required.includes(user.role)) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }

    req.user = user;
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const fromCookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
    if (fromCookie) return fromCookie;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return undefined;
  }
}
