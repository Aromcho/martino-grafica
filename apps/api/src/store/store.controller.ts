import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Track } from '../common/decorators/track.decorator';
import { IdsDto } from '../common/dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { BulkStoreDto, CreateOrderDto, PriceAdjustDto, StoreCategoryDto, StoreProductDto, UpdateStoreCategoryDto, UpdateStoreProductDto } from './dto/store.dto';
import { StoreImportService } from './store-import.service';
import { StoreService } from './store.service';

const int = (v: string | undefined, def: number) => Math.max(1, Number(v) || def);

@ApiTags('tienda')
@Controller()
export class StoreController {
  constructor(
    private readonly store: StoreService,
    private readonly importer: StoreImportService,
  ) {}

  // ------------------------------------------------ público
  @Get('store/categories')
  categories() {
    return this.store.categories();
  }

  @Get('store/products')
  products(
    @Query('category') category?: string,
    @Query('sub') sub?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('featured') featured?: string,
    @Query('stock') stock?: string,
  ) {
    return this.store.list({ category, sub, q, sort, page: int(page, 1), pageSize: int(pageSize, 24), featured: featured === 'true', inStock: stock === '1' });
  }

  @Get('store/products/:slug')
  product(@Param('slug') slug: string, @Query('view') view?: string) {
    return this.store.bySlug(slug, view !== '0');
  }

  /** Pedido de compra desde el carrito: lo guarda y devuelve el mensaje para seguir por WhatsApp */
  @Post('store/orders')
  @Throttle({ default: { limit: 8, ttl: 10 * 60_000 } })
  order(@Body() dto: CreateOrderDto) {
    return this.store.createOrder(dto);
  }

  // ------------------------------------------------ panel: productos
  @Get('admin/store/products')
  @UseGuards(AdminGuard)
  adminProducts(@Query('q') q?: string, @Query('category') category?: string, @Query('status') status?: string, @Query('sort') sort?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.store.adminList({ q, category, status, sort, page: int(page, 1), pageSize: Math.min(200, int(pageSize, 50)) });
  }

  @Get('admin/store/summary')
  @UseGuards(AdminGuard)
  async summary() {
    const [counts, imp] = await Promise.all([this.store.adminSummary(), this.importer.lastResult()]);
    return { ...counts, import: { ...imp, status: this.importer.status() } };
  }

  @Get('admin/store/products/:id')
  @UseGuards(AdminGuard)
  adminProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.store.byId(id);
  }

  @Post('admin/store/products')
  @UseGuards(AdminGuard)
  @Track('producto de la tienda', ['store'])
  create(@Body() dto: StoreProductDto) {
    return this.store.create(dto);
  }

  @Patch('admin/store/products/bulk')
  @UseGuards(AdminGuard)
  @Track('producto de la tienda', ['store'], 'editó en bloque')
  bulk(@Body() dto: BulkStoreDto) {
    return this.store.bulk(dto);
  }

  @Post('admin/store/prices')
  @UseGuards(AdminGuard)
  @Track('precios de la tienda', ['store'], 'recalculó')
  prices(@Body() dto: PriceAdjustDto) {
    return this.store.adjustPrices(dto);
  }

  @Patch('admin/store/products/:id')
  @UseGuards(AdminGuard)
  @Track('producto de la tienda', ['store'])
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoreProductDto) {
    return this.store.update(id, dto);
  }

  @Delete('admin/store/products/:id')
  @UseGuards(AdminGuard)
  @Track('producto de la tienda', ['store'])
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.store.remove(id);
  }

  /** Trae el catálogo de referencia del proveedor (precios de lista, stock y productos nuevos) */
  @Post('admin/store/import')
  @UseGuards(AdminGuard)
  @Track('catálogo de la tienda', [], 'actualizó')
  startImport() {
    return { ...this.importer.start(), label: 'Actualización del catálogo' };
  }

  @Get('admin/store/import')
  @UseGuards(AdminGuard)
  importStatus() {
    return this.importer.status();
  }

  // ------------------------------------------------ panel: categorías
  @Get('admin/store/categories')
  @UseGuards(AdminGuard)
  adminCategories() {
    return this.store.categories(true);
  }

  @Post('admin/store/categories')
  @UseGuards(AdminGuard)
  @Track('categoría de la tienda', ['store'])
  createCategory(@Body() dto: StoreCategoryDto) {
    return this.store.createCategory(dto);
  }

  @Put('admin/store/categories/order')
  @UseGuards(AdminGuard)
  @Track('categoría de la tienda', ['store'], 'reordenó')
  reorder(@Body() dto: IdsDto) {
    return this.store.reorderCategories(dto.ids);
  }

  @Patch('admin/store/categories/:id')
  @UseGuards(AdminGuard)
  @Track('categoría de la tienda', ['store'])
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoreCategoryDto) {
    return this.store.updateCategory(id, dto);
  }

  @Delete('admin/store/categories/:id')
  @UseGuards(AdminGuard)
  @Track('categoría de la tienda', ['store'])
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.store.removeCategory(id);
  }
}
