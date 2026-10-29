import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndef = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? undefined : typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : typeof value === 'string' ? value.trim() : value);

// ---------------------------------------------------------------- pedidos de compra (web)
export class OrderLineDto {
  @IsUUID() productId: string;
  @IsInt() @Min(1) @Max(999) quantity: number;
}

export class CreateOrderDto {
  @Transform(emptyToUndef)
  @IsString()
  @MinLength(2, { message: 'Contanos tu nombre' })
  @MaxLength(80)
  customerName: string;

  @Transform(emptyToUndef)
  @IsString()
  @Matches(/^[\d\s()+-]{8,24}$/, { message: 'Revisá el teléfono: usá sólo números (con código de área)' })
  phone: string;

  @Transform(emptyToUndef) @IsOptional() @IsEmail({}, { message: 'Revisá el email' }) email?: string;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsIn(['PICKUP', 'SHIPPING']) delivery?: 'PICKUP' | 'SHIPPING';
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(2000) message?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'El carrito está vacío' })
  @ArrayMaxSize(80, { message: 'Son demasiados productos para un solo pedido: escribinos por WhatsApp' })
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];

  /** Campo trampa anti-spam: los humanos no lo ven */
  @IsOptional() @IsString() website?: string;
}

// ---------------------------------------------------------------- panel
export class StoreProductDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) name: string;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(90) slug?: string;
  @IsUUID() categoryId: string;
  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(80) subcategory?: string | null;
  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(80) brand?: string | null;
  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(60) sku?: string | null;
  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(6000) description?: string | null;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) price?: number | null;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(30) unit?: string;
  @IsOptional() @IsBoolean() inStock?: boolean;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsUUID() imageId?: string | null;
}

export class UpdateStoreProductDto extends PartialType(StoreProductDto) {}

export class BulkStoreDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2000) @IsUUID('all', { each: true }) ids: string[];
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() inStock?: boolean;
  @IsOptional() @IsUUID() categoryId?: string;
}

export class PriceAdjustDto {
  /** Porcentaje sobre el precio de lista del proveedor: 30 = lista + 30 % */
  @IsNumber() @Min(-90) @Max(500) percent: number;
  @IsOptional() @IsUUID() categoryId?: string;
  /** Redondeo en pesos (10, 50, 100…) */
  @IsOptional() @IsInt() @Min(1) @Max(10_000) roundTo?: number;
}

export class StoreCategoryDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) name: string;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(60) slug?: string;
  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(160) tagline?: string | null;
  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional() @IsUUID() coverId?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateStoreCategoryDto extends PartialType(StoreCategoryDto) {}
