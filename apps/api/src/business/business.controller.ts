import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { Track } from '../common/decorators/track.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { toMinutes } from '../common/utils/time';
import { BusinessService } from './business.service';
import { ReplaceHoursDto, SettingDto, SpecialDayDto } from './dto/business.dto';

const EDITABLE_SETTINGS = ['business', 'season', 'quote', 'seo', 'home'];

@ApiTags('negocio')
@Controller()
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  /** Datos públicos del negocio + estado "abierto ahora" */
  @Get('business')
  @SkipThrottle()
  publicBusiness() {
    return this.business.publicBusiness();
  }

  @Get('hours')
  @SkipThrottle()
  hours() {
    return this.business.status();
  }

  // ------------------------------------------------ admin
  @Get('admin/settings')
  @UseGuards(AdminGuard)
  settings() {
    return this.business.allSettings();
  }

  @Put('admin/settings/:key')
  @UseGuards(AdminGuard)
  @Roles('ADMIN')
  @Track('ajuste', ['business', 'catalog', 'works', 'content'])
  async setSetting(@Param('key') key: string, @Body() dto: SettingDto) {
    if (!EDITABLE_SETTINGS.includes(key)) throw new BadRequestException('Ajuste desconocido');
    const row = await this.business.setSetting(key, dto.value);
    return { ...row, label: key };
  }

  @Get('admin/hours')
  @UseGuards(AdminGuard)
  async adminHours() {
    const [slots, special, season] = await Promise.all([this.business.hoursAll(), this.business.specialDaysAll(), this.business.seasonConfig()]);
    return { slots, special, season };
  }

  @Put('admin/hours')
  @UseGuards(AdminGuard)
  @Track('horario', ['business'])
  replaceHours(@Body() dto: ReplaceHoursDto) {
    for (const s of dto.slots) {
      if (toMinutes(s.closes) <= toMinutes(s.opens)) throw new BadRequestException(`La franja ${s.opens}–${s.closes} cierra antes de abrir`);
    }
    return this.business.replaceHours(dto.slots);
  }

  @Post('admin/special-days')
  @UseGuards(AdminGuard)
  @Track('feriado', ['business'])
  createSpecialDay(@Body() dto: SpecialDayDto) {
    return this.business.createSpecialDay(dto);
  }

  @Delete('admin/special-days/:id')
  @UseGuards(AdminGuard)
  @Track('feriado', ['business'])
  removeSpecialDay(@Param('id', ParseUUIDPipe) id: string) {
    return this.business.removeSpecialDay(id);
  }
}
