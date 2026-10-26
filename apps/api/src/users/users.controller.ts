import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { asc, eq } from 'drizzle-orm';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { Database, InjectDb } from '../db/db.module';
import { users } from '../db/schema';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const publicCols = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  active: users.active,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

@ApiTags('admin / usuarios')
@Controller('admin/users')
@UseGuards(AdminGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(@InjectDb() private readonly db: Database) {}

  @Get()
  list() {
    return this.db.select(publicCols).from(users).orderBy(asc(users.createdAt));
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const [row] = await this.db
      .insert(users)
      .values({
        email: dto.email.toLowerCase().trim(),
        name: dto.name,
        role: dto.role ?? 'EDITOR',
        passwordHash: await bcrypt.hash(dto.password, 12),
      })
      .returning(publicCols);
    return row;
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() me: AuthUser) {
    if (id === me.id && (dto.active === false || (dto.role && dto.role !== 'ADMIN'))) {
      throw new BadRequestException('No podés desactivarte ni quitarte el rol de administrador');
    }
    const { password, ...rest } = dto;
    const [row] = await this.db
      .update(users)
      .set({ ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) })
      .where(eq(users.id, id))
      .returning(publicCols);
    if (!row) throw new NotFoundException('Usuario no encontrado');
    return row;
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() me: AuthUser) {
    if (id === me.id) throw new BadRequestException('No podés eliminar tu propio usuario');
    await this.db.delete(users).where(eq(users.id, id));
    return { ok: true };
  }
}
