import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { seasonEnum, type Season } from '../../db/schema';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class HourSlotDto {
  @IsIn(seasonEnum.enumValues)
  season: Season;

  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @Matches(HHMM, { message: 'Hora inválida (usá HH:MM)' })
  opens: string;

  @Matches(HHMM, { message: 'Hora inválida (usá HH:MM)' })
  closes: string;
}

export class ReplaceHoursDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HourSlotDto)
  slots: HourSlotDto[];
}

export class SpecialDayDto {
  @IsDateString()
  date: string;

  @IsString()
  @MaxLength(80)
  label: string;

  @IsOptional()
  @IsBoolean()
  closed?: boolean;

  @IsOptional()
  @Matches(HHMM)
  opens?: string;

  @IsOptional()
  @Matches(HHMM)
  closes?: string;
}

export class SettingDto {
  @IsObject()
  value: Record<string, unknown>;
}
