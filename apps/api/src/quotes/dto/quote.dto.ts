import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
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
} from 'class-validator';
import { deliveryEnum, quoteKindEnum, quoteStatusEnum, type DeliveryMethod, type QuoteKind, type QuoteStatus } from '../../db/schema';

// En multipart todo llega como texto: se convierte acá
const toNumber = ({ value }: { value: unknown }) => (value === null ? null : value === '' || value === undefined ? undefined : Number(value));
const toBool = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1' || value === 'on';
const emptyToUndef = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? undefined : typeof value === 'string' ? value.trim() : value);

export class CreateQuoteDto {
  @IsOptional() @IsIn(quoteKindEnum.enumValues) kind?: QuoteKind;

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
  @Transform(emptyToUndef) @IsOptional() @IsUUID() productId?: string;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(120) productSlug?: string;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(120) productName?: string;

  @Transform(toNumber) @IsOptional() @IsNumber({}, { message: 'Ancho inválido' }) @Min(1) @Max(100000) width?: number;
  @Transform(toNumber) @IsOptional() @IsNumber({}, { message: 'Alto inválido' }) @Min(1) @Max(100000) height?: number;
  @Transform(toNumber) @IsOptional() @IsInt({ message: 'Cantidad inválida' }) @Min(1) @Max(100000) quantity?: number;

  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(120) material?: string;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(120) finish?: string;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(60) size?: string;
  @Transform(toBool) @IsOptional() @IsBoolean() needsDesign?: boolean;
  @Transform(emptyToUndef) @IsOptional() @IsIn(deliveryEnum.enumValues) delivery?: DeliveryMethod;
  @Transform(emptyToUndef) @IsOptional() @IsDateString() deadline?: string;
  @Transform(emptyToUndef) @IsOptional() @IsString() @MaxLength(2000) message?: string;

  /** Campo trampa anti-spam: los humanos no lo ven */
  @IsOptional() @IsString() website?: string;
}

export class UpdateQuoteDto {
  @IsOptional() @IsIn(quoteStatusEnum.enumValues) status?: QuoteStatus;
  @IsOptional() @IsString() @MaxLength(4000) adminNotes?: string | null;
  @Transform(toNumber) @IsOptional() @IsInt() @Min(0) quotedPrice?: number | null;
}

export class QuoteNoteDto {
  @IsString() @MinLength(1) @MaxLength(2000) note: string;
}
