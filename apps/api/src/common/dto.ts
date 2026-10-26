import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class IdsDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('4', { each: true })
  ids: string[];
}
