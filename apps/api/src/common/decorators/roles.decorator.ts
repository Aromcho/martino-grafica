import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../db/schema';

export const ROLES_KEY = 'roles';
/** Restringe un endpoint del panel a ciertos roles */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
