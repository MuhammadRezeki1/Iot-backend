import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PowerService } from './power.service';
import { MqttService } from '../mqtt/mqtt.service';
import { PowerLog } from './power.entity';

@Controller('power')
export class PowerController {
  constructor(
    private readonly powerService: PowerService,
    private readonly mqttService: MqttService, // 🔥 Inject MqttService
  ) {}

  // ================= MQTT CONTROL ENDPOINTS =================

  /**
   * POST /power/control
   * Toggle ON/OFF relay via MQTT
   * Body: { "status": "on" } atau { "status": "off" }
   */
  @Post('control')
  async controlPower(@Body('status') status: 'on' | 'off') {
    console.log('📡 POST /power/control called with status:', status);

    // Validasi input
    if (status !== 'on' && status !== 'off') {
      console.error('❌ Invalid status:', status);
      return {
        success: false,
        message: 'Status harus "on" atau "off"',
        timestamp: new Date().toISOString(),
      };
    }

    // Publish MQTT command
    this.mqttService.publishPowerControl(status);

    console.log(`✅ Power control command sent: ${status.toUpperCase()}`);
    return {
      success: true,
      message: `Relay berhasil di-set ke ${status.toUpperCase()}`,
      status: status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /power/reboot
   * Reboot device via MQTT
   */
  @Post('reboot')
  async rebootDevice() {
    console.log('📡 POST /power/reboot called');

    // Publish MQTT reboot command
    this.mqttService.publishReboot();

    console.log('✅ Reboot command sent to device');
    return {
      success: true,
      message: 'Perintah reboot berhasil dikirim ke device',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /power/status
   * Cek status koneksi MQTT
   */
  @Get('status')
  async getMqttStatus() {
    const isConnected = this.mqttService.isConnected();
    return {
      mqtt_connected: isConnected,
      status: isConnected ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
    };
  }

  // ================= REALTIME ENDPOINTS - 7 DATA TERAKHIR =================

  /**
   * GET /power/last7
   * Ambil 7 data terakhir dari power_logs
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

  @Get('daily')
  async getDaily() {
    console.log('📡 GET /power/daily called');
    const data = await this.powerService.getDailyData();
    console.log('✅ Returning', data.length, 'records');
    return data;
  }

  @Get('weekly')
  async getWeekly() {
    console.log('📡 GET /power/weekly called');
    const data = await this.powerService.getWeeklyData();
    console.log('✅ Returning', data.length, 'records');
    return data;
  }

  @Get('monthly')
  async getMonthly() {
    console.log('📡 GET /power/monthly called');
    const data = await this.powerService.getMonthlyData();
    console.log('✅ Returning', data.length, 'records');
    return data;
  }

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
    console.log('📡 GET /power/range called');
    return this.powerService.findByDateRange(new Date(start), new Date(end));
  }
}