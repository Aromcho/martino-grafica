import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, StreamableFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Track } from '../common/decorators/track.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { quoteKindEnum, quoteStatusEnum, type QuoteKind, type QuoteStatus } from '../db/schema';
import { CreateQuoteDto, QuoteNoteDto, UpdateQuoteDto } from './dto/quote.dto';
import { QuotesService } from './quotes.service';

const MAX_MB = Number(process.env.QUOTE_FILE_MAX_MB ?? 25);

@ApiTags('presupuestos')
@Controller()
export class QuotesController {
  constructor(
    private readonly quotes: QuotesService,
    private readonly config: ConfigService,
  ) {}

  /** Pedido de presupuesto o consulta desde la web. Acepta hasta 5 archivos de diseño (campo "files"). */
  @Post('quotes')
  @Throttle({ default: { limit: 6, ttl: 10 * 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5, { storage: memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 5 } }))
  create(@Body() dto: CreateQuoteDto, @UploadedFiles() files: Express.Multer.File[] = []) {
    return this.quotes.create(dto, files, Number(this.config.get('QUOTE_FILE_MAX_MB') ?? MAX_MB));
  }

  // ------------------------------------------------ admin
  @Get('admin/quotes')
  @UseGuards(AdminGuard)
  list(@Query('status') status?: string, @Query('kind') kind?: string, @Query('q') q?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.quotes.list({
      status: status === 'ACTIVE' ? 'ACTIVE' : quoteStatusEnum.enumValues.includes(status as QuoteStatus) ? (status as QuoteStatus) : undefined,
      kind: quoteKindEnum.enumValues.includes(kind as QuoteKind) ? (kind as QuoteKind) : undefined,
      q,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSize) || 30)),
    });
  }

  @Get('admin/quotes/:id')
  @UseGuards(AdminGuard)
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.detail(id);
  }

  @Patch('admin/quotes/:id')
  @UseGuards(AdminGuard)
  @Track('pedido', [])
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuoteDto, @CurrentUser() user: AuthUser) {
    return this.quotes.update(id, dto, user.id);
  }

  @Post('admin/quotes/:id/notes')
  @UseGuards(AdminGuard)
  note(@Param('id', ParseUUIDPipe) id: string, @Body() dto: QuoteNoteDto, @CurrentUser() user: AuthUser) {
    return this.quotes.addNote(id, dto.note, user.id);
  }

  /** Registra la respuesta por WhatsApp y devuelve el link con el mensaje armado */
  @Post('admin/quotes/:id/whatsapp')
  @UseGuards(AdminGuard)
  @Track('pedido', [], 'respondió por WhatsApp')
  whatsapp(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.logWhatsapp(id, user.id);
  }

  @Get('admin/quotes/:id/files/:fileId')
  @UseGuards(AdminGuard)
  async file(@Param('id', ParseUUIDPipe) id: string, @Param('fileId', ParseUUIDPipe) fileId: string, @Res({ passthrough: true }) res: Response) {
    const f = await this.quotes.file(id, fileId);
    res.set({
      'Content-Type': f.mime,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(f.stream);
  }

  @Delete('admin/quotes/:id')
  @UseGuards(AdminGuard)
  @Roles('ADMIN')
  @Track('pedido', [])
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.remove(id);
  }
}
