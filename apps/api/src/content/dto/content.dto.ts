import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { bannerPlacementEnum, type BannerPlacement } from '../../db/schema';

export class HighlightItemDto {
  @IsUUID() mediaId: string;
  @IsOptional() @IsString() @MaxLength(200) caption?: string | null;
  @IsOptional() @IsUUID() workId?: string | null;
  @IsOptional() @IsUUID() productId?: string | null;
  @IsOptional() @IsString() @MaxLength(300) linkUrl?: string | null;
  @IsOptional() @IsInt() @Min(2000) @Max(20000) durationMs?: number;
}

export class HighlightDto {
  @IsString() @MinLength(2) @MaxLength(40) title: string;
  @IsOptional() @IsString() @MaxLength(60) slug?: string;
  @IsOptional() @IsUUID() coverId?: string | null;
  @IsOptional() @IsUUID() categoryId?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(80) @ValidateNested({ each: true }) @Type(() => HighlightItemDto) items?: HighlightItemDto[];
}
export class UpdateHighlightDto extends PartialType(HighlightDto) {}

export class BannerDto {
  @IsString() @MinLength(2) @MaxLength(120) title: string;
  @IsOptional() @IsIn(bannerPlacementEnum.enumValues) placement?: BannerPlacement;
  @IsOptional() @IsString() @MaxLength(300) subtitle?: string | null;
  @IsOptional() @IsString() @MaxLength(40) ctaLabel?: string | null;
  @IsOptional() @IsString() @MaxLength(300) ctaHref?: string | null;
  @IsOptional() @IsUUID() mediaId?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsDateString() startsAt?: string | null;
  @IsOptional() @IsDateString() endsAt?: string | null;
  @IsOptional() @IsInt() sortOrder?: number;
}
export class UpdateBannerDto extends PartialType(BannerDto) {}
