import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { deliveryEnum, workOrderStatusEnum, type DeliveryMethod, type WorkOrderStatus } from '../../db/schema';

export const PAYMENT_METHODS = ['EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'TARJETA', 'OTRO'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Texto opcional: vacío = null (así se puede borrar un dato desde el panel) */
const textOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

const PHONE = /^[\d\s()+-]{6,24}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MONEY = 2_000_000_000;

export class CreateOrderDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Anotá el nombre del cliente' })
  @MaxLength(80)
  customerName: string;

  @Transform(textOrNull) @IsOptional() @Matches(PHONE, { message: 'Revisá el teléfono: sólo números, con código de área' }) phone?: string | null;

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Anotá qué pidió' })
  @MaxLength(160)
  title: string;

  @Transform(textOrNull) @IsOptional() @IsString() @MaxLength(4000) details?: string | null;
  @IsOptional() @IsIn(deliveryEnum.enumValues) delivery?: DeliveryMethod;
  @Transform(textOrNull) @IsOptional() @Matches(DAY, { message: 'Fecha de entrega inválida' }) dueDate?: string | null;
  @Transform(textOrNull) @IsOptional() @IsString() @MaxLength(80) dueNote?: string | null;
  @IsOptional() @IsInt({ message: 'Total inválido' }) @Min(0) @Max(MAX_MONEY) total?: number | null;
  /** Seña o pago que deja al hacer el pedido */
  @IsOptional() @IsInt({ message: 'Seña inválida' }) @Min(0) @Max(MAX_MONEY) deposit?: number | null;
  @IsOptional() @IsIn(PAYMENT_METHODS) depositMethod?: PaymentMethod;
  @Transform(textOrNull) @IsOptional() @IsString() @MaxLength(4000) notes?: string | null;
  /** Sólo "A confirmar" o "Por hacer" al cargarlo */
  @IsOptional() @IsIn(['TO_CONFIRM', 'PENDING']) status?: 'TO_CONFIRM' | 'PENDING';
}

export class UpdateOrderDto {
  @Transform(trim) @IsOptional() @IsString() @MinLength(2, { message: 'Anotá el nombre del cliente' }) @MaxLength(80) customerName?: string;
  @Transform(textOrNull) @IsOptional() @Matches(PHONE, { message: 'Revisá el teléfono: sólo números, con código de área' }) phone?: string | null;
  @Transform(trim) @IsOptional() @IsString() @MinLength(1, { message: 'Anotá qué pidió' }) @MaxLength(160) title?: string;
  @Transform(textOrNull) @IsOptional() @IsString() @MaxLength(4000) details?: string | null;
  @IsOptional() @IsIn(deliveryEnum.enumValues) delivery?: DeliveryMethod;
  @Transform(textOrNull) @IsOptional() @Matches(DAY, { message: 'Fecha de entrega inválida' }) dueDate?: string | null;
  @Transform(textOrNull) @IsOptional() @IsString() @MaxLength(80) dueNote?: string | null;
  @IsOptional() @IsInt({ message: 'Total inválido' }) @Min(0) @Max(MAX_MONEY) total?: number | null;
  @Transform(textOrNull) @IsOptional() @IsString() @MaxLength(4000) notes?: string | null;
  @IsOptional() @IsIn(workOrderStatusEnum.enumValues) status?: WorkOrderStatus;
}

export class OrderPaymentDto {
  @IsInt({ message: 'Importe inválido' }) @Min(1, { message: 'El importe tiene que ser mayor a cero' }) @Max(MAX_MONEY) amount: number;
  @IsOptional() @IsIn(PAYMENT_METHODS) method?: PaymentMethod;
  @Transform(textOrNull) @IsOptional() @IsString() @MaxLength(200) note?: string | null;
}

export class OrderNoteDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(2000) note: string;
}

/** Fila de la planilla "Agenda de pendientes" ya normalizada */
export class ImportOrderRowDto {
  @IsString() @MaxLength(40) ref: string;
  @Matches(/^\d{4}-\d{2}$/) month: string;
  @IsInt() @Min(0) row: number;
  @IsString() @MinLength(1) @MaxLength(120) customerName: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsString() @MaxLength(300) title: string;
  @IsOptional() @IsString() @MaxLength(4000) details?: string | null;
  @IsOptional() @Matches(DAY) dueDate?: string | null;
  @IsOptional() @IsString() @MaxLength(120) dueNote?: string | null;
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY) total?: number | null;
  @IsInt() @Min(0) @Max(MAX_MONEY) paid: number;
  @IsIn(workOrderStatusEnum.enumValues) status: WorkOrderStatus;
  @IsIn(deliveryEnum.enumValues) delivery: DeliveryMethod;
  @IsOptional() @IsString() @MaxLength(200) sheetStatus?: string | null;
  @IsOptional() @IsBoolean() statusGuessed?: boolean;
  @IsOptional() @IsString() @MaxLength(40) carriedFrom?: string;
}

export class ImportOrdersDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ImportOrderRowDto)
  rows: ImportOrderRowDto[];
}
