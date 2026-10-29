import { Global, Module } from '@nestjs/common';
import { StoreImportService } from './store-import.service';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Global()
@Module({ controllers: [StoreController], providers: [StoreService, StoreImportService], exports: [StoreService] })
export class StoreModule {}
