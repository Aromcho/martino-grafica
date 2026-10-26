import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Track } from '../common/decorators/track.decorator';
import { IdsDto } from '../common/dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { bannerPlacementEnum, type BannerPlacement } from '../db/schema';
import { ContentService } from './content.service';
import { BannerDto, HighlightDto, UpdateBannerDto, UpdateHighlightDto } from './dto/content.dto';

@ApiTags('contenidos')
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('highlights')
  highlights() {
    return this.content.highlights();
  }

  @Get('banners')
  banners(@Query('placement') placement?: string) {
    const p = bannerPlacementEnum.enumValues.includes(placement as BannerPlacement) ? (placement as BannerPlacement) : undefined;
    return this.content.banners(p);
  }

  // ------------------------------------------------ admin: historias
  @Get('admin/highlights')
  @UseGuards(AdminGuard)
  adminHighlights() {
    return this.content.highlights(true);
  }

  @Get('admin/highlights/:id')
  @UseGuards(AdminGuard)
  adminHighlight(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.highlight(id);
  }

  @Post('admin/highlights')
  @UseGuards(AdminGuard)
  @Track('historia', ['content'])
  createHighlight(@Body() dto: HighlightDto) {
    return this.content.createHighlight(dto);
  }

  @Put('admin/highlights/order')
  @UseGuards(AdminGuard)
  @Track('historia', ['content'], 'reordenó')
  reorderHighlights(@Body() dto: IdsDto) {
    return this.content.reorderHighlights(dto.ids);
  }

  @Patch('admin/highlights/:id')
  @UseGuards(AdminGuard)
  @Track('historia', ['content'])
  updateHighlight(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHighlightDto) {
    return this.content.updateHighlight(id, dto);
  }

  @Delete('admin/highlights/:id')
  @UseGuards(AdminGuard)
  @Track('historia', ['content'])
  removeHighlight(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.removeHighlight(id);
  }

  // ------------------------------------------------ admin: banners
  @Get('admin/banners')
  @UseGuards(AdminGuard)
  adminBanners() {
    return this.content.adminBanners();
  }

  @Post('admin/banners')
  @UseGuards(AdminGuard)
  @Track('banner', ['content'])
  createBanner(@Body() dto: BannerDto) {
    return this.content.createBanner(dto);
  }

  @Put('admin/banners/order')
  @UseGuards(AdminGuard)
  @Track('banner', ['content'], 'reordenó')
  reorderBanners(@Body() dto: IdsDto) {
    return this.content.reorderBanners(dto.ids);
  }

  @Patch('admin/banners/:id')
  @UseGuards(AdminGuard)
  @Track('banner', ['content'])
  updateBanner(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBannerDto) {
    return this.content.updateBanner(id, dto);
  }

  @Delete('admin/banners/:id')
  @UseGuards(AdminGuard)
  @Track('banner', ['content'])
  removeBanner(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.removeBanner(id);
  }
}
