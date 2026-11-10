import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Track } from '../common/decorators/track.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { workOrderStatusEnum, type WorkOrderStatus } from '../db/schema';
import { CreateOrderDto, OrderNoteDto, OrderPaymentDto, UpdateOrderDto } from './dto/order.dto';
import { OrdersService, type OrderView } from './orders.service';

const VIEWS: OrderView[] = ['active', 'unpaid', 'delivered', 'all'];

@ApiTags('pedidos del taller')
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Seguimiento público: lo abre el cliente con el link que le pasa el taller */
  @Get('orders/track/:code')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  track(@Param('code') code: string) {
    return this.orders.track(code);
  }

  // ------------------------------------------------ admin
  @Get('admin/orders')
  @UseGuards(AdminGuard)
  list(
    @Query('view') view?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('month') month?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.orders.list({
      view: VIEWS.includes(view as OrderView) ? (view as OrderView) : 'all',
      status: workOrderStatusEnum.enumValues.includes(status as WorkOrderStatus) ? (status as WorkOrderStatus) : undefined,
      q: q?.trim().slice(0, 80) || undefined,
      month: month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : undefined,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSize) || 40)),
    });
  }

  @Get('admin/orders/board')
  @UseGuards(AdminGuard)
  board() {
    return this.orders.board();
  }

  @Get('admin/orders/summary')
  @UseGuards(AdminGuard)
  summary() {
    return this.orders.summary();
  }

  @Get('admin/orders/customers')
  @UseGuards(AdminGuard)
  customers(@Query('q') q?: string) {
    return this.orders.customers((q ?? '').slice(0, 60));
  }

  @Post('admin/orders')
  @UseGuards(AdminGuard)
  @Track('pedido', [])
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orders.create(dto, user.id);
  }

  /** Convierte una consulta o compra de la web en pedido del taller */
  @Post('admin/quotes/:id/order')
  @UseGuards(AdminGuard)
  @Track('pedido', [], 'pasó a pedido')
  fromQuote(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.orders.fromQuote(id, user.id);
  }

  @Get('admin/orders/:id')
  @UseGuards(AdminGuard)
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.detail(id);
  }

  @Patch('admin/orders/:id')
  @UseGuards(AdminGuard)
  @Track('pedido', [])
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orders.update(id, dto, user.id);
  }

  @Post('admin/orders/:id/payments')
  @UseGuards(AdminGuard)
  @Track('pedido', [], 'cobró')
  addPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: OrderPaymentDto, @CurrentUser() user: AuthUser) {
    return this.orders.addPayment(id, dto, user.id);
  }

  @Delete('admin/orders/:id/payments/:paymentId')
  @UseGuards(AdminGuard)
  @Track('pedido', [], 'anuló un cobro de')
  removePayment(@Param('id', ParseUUIDPipe) id: string, @Param('paymentId', ParseUUIDPipe) paymentId: string, @CurrentUser() user: AuthUser) {
    return this.orders.removePayment(id, paymentId, user.id);
  }

  @Post('admin/orders/:id/notes')
  @UseGuards(AdminGuard)
  note(@Param('id', ParseUUIDPipe) id: string, @Body() dto: OrderNoteDto, @CurrentUser() user: AuthUser) {
    return this.orders.addNote(id, dto.note, user.id);
  }

  /** Deja anotado que se le mandó el link de seguimiento */
  @Post('admin/orders/:id/whatsapp')
  @UseGuards(AdminGuard)
  whatsapp(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.orders.logWhatsapp(id, user.id);
  }

  @Delete('admin/orders/:id')
  @UseGuards(AdminGuard)
  @Roles('ADMIN')
  @Track('pedido', [])
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.remove(id);
  }
}
