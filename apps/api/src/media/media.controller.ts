import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { memoryStorage } from 'multer';
import { Track } from '../common/decorators/track.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { paginate } from '../common/utils/pagination';
import type { MediaKind } from '../db/schema';
import { MediaService } from './media.service';

class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  alt?: string;
}

class ReorderDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids: string[];
}

@ApiTags('admin / medios')
@Controller('admin/media')
@UseGuards(AdminGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  async list(@Query('page') page = '1', @Query('pageSize') pageSize = '48', @Query('kind') kind?: MediaKind, @Query('q') q?: string) {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(200, Math.max(1, Number(pageSize) || 48));
    const { items, total } = await this.media.list({ page: p, pageSize: ps, kind: kind === 'IMAGE' || kind === 'VIDEO' ? kind : undefined, q });
    return paginate(items, total, p, ps);
  }

  /** Sube uno o varios archivos (campo "files"). Devuelve los medios creados. */
  @Post()
  @Track('medio', ['catalog', 'works', 'content'], 'subió')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } }, alt: { type: 'string' } } } })
  @UseInterceptors(FilesInterceptor('files', 20, { storage: memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } }))
  async upload(@UploadedFiles() files: Express.Multer.File[], @Body('alt') alt?: string) {
    if (!files?.length) throw new BadRequestException('Elegí al menos un archivo');
    const items = [];
    for (const f of files) items.push(await this.media.upload(f, alt));
    return { items, label: `${items.length} archivo${items.length === 1 ? '' : 's'}` };
  }

  @Put('order')
  @Track('medio', [], 'reordenó')
  reorder(@Body() dto: ReorderDto) {
    return this.media.reorder(dto.ids);
  }

  @Patch(':id')
  @Track('medio', ['catalog', 'works', 'content'])
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMediaDto) {
    return this.media.update(id, dto);
  }

  @Delete(':id')
  @Track('medio', ['catalog', 'works', 'content'])
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.remove(id);
  }
}
