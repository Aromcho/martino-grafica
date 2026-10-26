import { Global, Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CategoriesService } from './categories.service';
import { ProductsService } from './products.service';

@Global()
@Module({ controllers: [CatalogController], providers: [CategoriesService, ProductsService], exports: [CategoriesService, ProductsService] })
export class CatalogModule {}
