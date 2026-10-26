import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Track } from '../common/decorators/track.decorator';
import { IdsDto } from '../common/dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { CategoriesService } from './categories.service';
import { CategoryDto, ProductDto, UpdateCategoryDto, UpdateProductDto } from './dto/catalog.dto';
import { ProductsService } from './products.service';

@ApiTags('servicios')
@Controller()
export class CatalogController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly products: ProductsService,
  ) {}

  @Get('categories')
  listCategories() {
    return this.categories.list();
  }

  @Get('categories/:slug')
  async category(@Param('slug') slug: string) {
    const cat = await this.categories.bySlug(slug);
    const items = await this.products.list({ category: slug });
    return { ...cat, products: items };
  }

  @Get('products')
  listProducts(@Query('category') category?: string, @Query('q') q?: string, @Query('featured') featured?: string, @Query('limit') limit?: string) {
    return this.products.list({ category, q, featured: featured === 'true', limit: limit ? Math.min(100, Number(limit) || 0) || undefined : undefined });
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string, @Query('view') view?: string) {
    return this.products.bySlug(slug, view !== '0');
  }

  // ------------------------------------------------ admin: rubros
  @Get('admin/categories')
  @UseGuards(AdminGuard)
  adminCategories() {
    return this.categories.list(true);
  }

  @Post('admin/categories')
  @UseGuards(AdminGuard)
  @Track('rubro', ['catalog', 'works', 'content'])
  createCategory(@Body() dto: CategoryDto) {
    return this.categories.create(dto);
  }

  @Put('admin/categories/order')
  @UseGuards(AdminGuard)
  @Track('rubro', ['catalog', 'works'], 'reordenó')
  reorderCategories(@Body() dto: IdsDto) {
    return this.categories.reorder(dto.ids);
  }

  @Patch('admin/categories/:id')
  @UseGuards(AdminGuard)
  @Track('rubro', ['catalog', 'works', 'content'])
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete('admin/categories/:id')
  @UseGuards(AdminGuard)
  @Track('rubro', ['catalog', 'works', 'content'])
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }

  // ------------------------------------------------ admin: servicios / productos
  @Get('admin/products')
  @UseGuards(AdminGuard)
  adminProducts(@Query('q') q?: string, @Query('category') category?: string) {
    return this.products.list({ q, category, includeInactive: true });
  }

  @Get('admin/products/:id')
  @UseGuards(AdminGuard)
  adminProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.byId(id);
  }

  @Post('admin/products')
  @UseGuards(AdminGuard)
  @Track('servicio', ['catalog', 'works'])
  createProduct(@Body() dto: ProductDto) {
    return this.products.create(dto);
  }

  @Put('admin/products/order')
  @UseGuards(AdminGuard)
  @Track('servicio', ['catalog'], 'reordenó')
  reorderProducts(@Body() dto: IdsDto) {
    return this.products.reorder(dto.ids);
  }

  @Patch('admin/products/:id')
  @UseGuards(AdminGuard)
  @Track('servicio', ['catalog', 'works'])
  updateProduct(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete('admin/products/:id')
  @UseGuards(AdminGuard)
  @Track('servicio', ['catalog', 'works'])
  removeProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(id);
  }
}
