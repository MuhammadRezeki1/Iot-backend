import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PowerService } from './power.service';
import { PowerLog } from './power.entity';

@Controller('power')
export class PowerController {
  constructor(private readonly powerService: PowerService) {}

  // ================= REALTIME ENDPOINTS - 7 DATA TERAKHIR =================

  /**
   * GET /power/last7
   * Ambil 7 data terakhir dari power_logs
   * Digunakan untuk: Dashboard & Real-time Monitoring
   * Return: Array of 7 PowerLog objects (oldest to newest)
   */
  @Get('last7')
  async getLast7(): Promise<PowerLog[]> {
    console.log('📡 GET /power/last7 called');
    const data = await this.powerService.getLast7();
    console.log('✅ Returning', data.length, 'records');
    return data;
  }

  /**
   * GET /power/latest
   * Ambil 1 data terbaru untuk current metrics
   */
  @Get('latest')
  async getLatest(): Promise<PowerLog | null> {
    console.log('📡 GET /power/latest called');
    return this.powerService.getLatest();
  }

  /**
   * GET /power/all
   * Semua data (max 1000 records)
   */
  @Get('all')
  async getAll() {
    console.log('📡 GET /power/all called');
    return this.powerService.findAll();
  }

  /**
   * POST /power
   * Save new power data
   */
  @Post()
  async save(@Body() payload: Partial<PowerLog>) {
    console.log('📡 POST /power called', payload);
    return this.powerService.save(payload);
  }

  // ================= HISTORY ENDPOINTS =================

  /**
   * GET /power/daily
   * Hourly data untuk 24 jam terakhir
   */
  @Get('daily')
  async getDaily() {
    console.log('📡 GET /power/daily called');
    const data = await this.powerService.getDailyData();
    console.log('✅ Returning', data.length, 'records');
    return data;
  }

  /**
   * GET /power/weekly
   * Daily data untuk 7 hari terakhir
   */
  @Get('weekly')
  async getWeekly() {
    console.log('📡 GET /power/weekly called');
    const data = await this.powerService.getWeeklyData();
    console.log('✅ Returning', data.length, 'records');
    return data;
  }

  /**
   * GET /power/monthly
   * Daily data untuk 30 hari terakhir
   */
  @Get('monthly')
  async getMonthly() {
    console.log('📡 GET /power/monthly called');
    const data = await this.powerService.getMonthlyData();
    console.log('✅ Returning', data.length, 'records');
    return data;
  }

  /**
   * GET /power/statistics
   * Summary statistics
   */
  @Get('statistics')
  async getStatistics(@Query('days') days?: string) {
    console.log('📡 GET /power/statistics called');
    const data = await this.powerService.getStatistics(days ? parseInt(days) : 30);
    console.log('✅ Statistics:', data);
    return data;
  }

  // ================= REPORTS ENDPOINTS =================

  @Get('reports/monthly')
  async getMonthlyReports() {
    console.log('📡 GET /power/reports/monthly called');
    const data = await this.powerService.getMonthlyReports();
    console.log('✅ Monthly reports:', data.length, 'months');
    return data;
  }

  @Get('reports/current-month')
  async getCurrentMonthReport() {
    console.log('📡 GET /power/reports/current-month called');
    const data = await this.powerService.getCurrentMonthReport();
    console.log('✅ Current month report:', data);
    return data;
  }

  // ================= ANALYSIS ENDPOINTS =================

  @Get('analysis/peak-usage')
  async getAnalysisPeakUsage() {
    console.log('📡 GET /power/analysis/peak-usage called');
    const data = await this.powerService.getAnalysisPeakUsage();
    console.log('✅ Peak usage data:', data.length, 'records');
    return data;
  }

  @Get('analysis/load-pattern')
  async getLoadPattern() {
    console.log('📡 GET /power/analysis/load-pattern called');
    const data = await this.powerService.getLoadPattern();
    console.log('✅ Load pattern data:', data.length, 'days');
    return data;
  }

  @Get('analysis/power-factor')
  async getPowerFactorAverage() {
    console.log('📡 GET /power/analysis/power-factor called');
    const data = await this.powerService.getPowerFactorAverage();
    console.log('✅ Power factor:', data);
    return { power_factor: data };
  }

  // ================= UTILITY ENDPOINTS =================

  @Get('range')
  getRange(@Query('start') start: string, @Query('end') end: string) {
    return this.powerService.findByDateRange(new Date(start), new Date(end));
  }
}