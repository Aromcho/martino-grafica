import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Track } from '../common/decorators/track.decorator';
import { IdsDto } from '../common/dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { UpdateWorkDto, WorkDto } from './dto/work.dto';
import { WorksService } from './works.service';

@ApiTags('trabajos')
@Controller()
export class WorksController {
  constructor(private readonly works: WorksService) {}

  @Get('works')
  list(
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('q') q?: string,
    @Query('featured') featured?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.works.list({ category, location, q, featured: featured === 'true', page: Number(page) || 1, pageSize: Number(pageSize) || 24 });
  }

  @Get('works/facets')
  facets() {
    return this.works.facets();
  }

  @Get('works/:slug')
  detail(@Param('slug') slug: string, @Query('view') view?: string) {
    return this.works.bySlug(slug, view !== '0');
  }

  // ------------------------------------------------ admin
  @Get('admin/works')
  @UseGuards(AdminGuard)
  adminList(@Query('q') q?: string, @Query('category') category?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.works.list({ q, category, includeInactive: true, sort: 'manual', page: Number(page) || 1, pageSize: Number(pageSize) || 60 });
  }

  @Get('admin/works/:id')
  @UseGuards(AdminGuard)
  adminDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.works.byId(id);
  }

  @Post('admin/works')
  @UseGuards(AdminGuard)
  @Track('trabajo', ['works', 'catalog'])
  create(@Body() dto: WorkDto) {
    return this.works.create(dto);
  }

  @Put('admin/works/order')
  @UseGuards(AdminGuard)
  @Track('trabajo', ['works'], 'reordenó')
  reorder(@Body() dto: IdsDto) {
    return this.works.reorder(dto.ids);
  }

  @Patch('admin/works/:id')
  @UseGuards(AdminGuard)
  @Track('trabajo', ['works', 'catalog'])
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkDto) {
    return this.works.update(id, dto);
  }

  @Delete('admin/works/:id')
  @UseGuards(AdminGuard)
  @Track('trabajo', ['works', 'catalog', 'content'])
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.works.remove(id);
  }
}
