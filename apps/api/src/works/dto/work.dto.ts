import { PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class WorkDto {
  @IsString() @MinLength(2) @MaxLength(140) title: string;
  @IsUUID() categoryId: string;
  @IsOptional() @IsString() @MaxLength(140) slug?: string;
  @IsOptional() @IsString() @MaxLength(120) client?: string | null;
  @IsOptional() @IsUUID() productId?: string | null;
  @IsOptional() @IsString() @MaxLength(80) location?: string | null;
  @IsOptional() @IsDateString() doneAt?: string | null;
  @IsOptional() @IsString() @MaxLength(300) summary?: string | null;
  @IsOptional() @IsString() @MaxLength(6000) description?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) materials?: string[];
  @IsOptional() @IsUUID() coverId?: string | null;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsString() @MaxLength(40) instagramCode?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(60) @IsUUID('4', { each: true }) imageIds?: string[];
}

export class UpdateWorkDto extends PartialType(WorkDto) {}
