import { Global, Module } from '@nestjs/common';
import { WorksController } from './works.controller';
import { WorksService } from './works.service';

@Global()
@Module({ controllers: [WorksController], providers: [WorksService], exports: [WorksService] })
export class WorksModule {}
