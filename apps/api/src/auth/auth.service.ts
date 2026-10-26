import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Database, InjectDb } from '../db/db.module';
import { users } from '../db/schema';

// Hash inválido para comparar siempre y no filtrar si el email existe (timing)
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5XU4XJ1aXX1qMjQ3pV4pOQ6m0k1dQ3a';

@Injectable()
export class AuthService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.db.query.users.findFirst({ where: eq(users.email, email.toLowerCase().trim()) });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.active) throw new UnauthorizedException('Email o contraseña incorrectos');

    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual no coincide');
    }
    await this.db.update(users).set({ passwordHash: await bcrypt.hash(next, 12) }).where(eq(users.id, userId));
    return { ok: true };
  }
}
