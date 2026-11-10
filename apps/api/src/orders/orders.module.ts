import { Global, Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/** Pedidos del taller: lo que se toma en el mostrador, sus cobros y el link de seguimiento para el cliente */
@Global()
@Module({ controllers: [OrdersController], providers: [OrdersService], exports: [OrdersService] })
export class OrdersModule {}
