import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PowerService } from './power.service';
import { PowerLog } from './power.entity';

@Controller('power')
export class PowerController {
  constructor(private readonly powerService: PowerService) {}

  // ================= REALTIME =================

  @Get()
  async getLast7(): Promise<PowerLog[]> {
    const data = await this.powerService.getLast7();
    return data.reverse(); // timeline kiri → kanan
  }

  @Post()
  async save(@Body() payload: Partial<PowerLog>) {
    return this.powerService.save(payload);
  }

  // ================= HISTORY =================

  @Get('daily')
  getDaily() {
    return this.powerService.getDailyData();
  }

  @Get('weekly')
  getWeekly() {
    return this.powerService.getWeeklyData();
  }

  @Get('monthly')
  getMonthly() {
    return this.powerService.getMonthlyData();
  }

  @Get('statistics')
  getStatistics(@Query('days') days?: string) {
    return this.powerService.getStatistics(days ? parseInt(days) : 30);
  }

  @Get('range')
  getRange(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.powerService.findByDateRange(
      new Date(start),
      new Date(end),
    );
  }

  @Get('all')
  getAll() {
    return this.powerService.findAll();
  }
}