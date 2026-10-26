import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { quoteModeEnum, type QuoteMode } from '../../db/schema';

export class CategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @MaxLength(40) shortName?: string;
  @IsOptional() @IsString() @MaxLength(160) tagline?: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) materials?: string[];
  @IsOptional() @IsUUID() coverId?: string | null;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class PriceTierDto {
  @IsInt() @Min(1) minQty: number;
  @IsInt() @Min(0) price: number;
  @IsOptional() @IsString() @MaxLength(60) label?: string;
}

export class SizeOptionDto {
  @IsString() @MaxLength(60) label: string;
  @IsOptional() @IsNumber() @Min(0) width?: number;
  @IsOptional() @IsNumber() @Min(0) height?: number;
}

export class ProductDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsUUID() categoryId: string;
  @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(300) summary?: string | null;
  @IsOptional() @IsString() @MaxLength(6000) description?: string | null;
  @IsOptional() @IsInt() @Min(0) priceFrom?: number | null;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => PriceTierDto) priceTiers?: PriceTierDto[];
  @IsOptional() @IsString() @MaxLength(200) priceNote?: string | null;
  @IsOptional() @IsString() @MaxLength(30) unit?: string;
  @IsOptional() @IsString() @MaxLength(60) leadTime?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) materials?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) finishes?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) features?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => SizeOptionDto) sizes?: SizeOptionDto[];
  @IsOptional() @IsObject() specs?: Record<string, string>;
  @IsOptional() @IsIn(quoteModeEnum.enumValues) quoteMode?: QuoteMode;
  @IsOptional() @IsInt() @Min(1) minQty?: number;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsUUID('4', { each: true }) imageIds?: string[];
}

export class UpdateCategoryDto extends PartialType(CategoryDto) {}
export class UpdateProductDto extends PartialType(ProductDto) {}
