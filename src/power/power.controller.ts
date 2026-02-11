import { Controller, Get, Post, Body, Query, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PowerService } from './power.service';
import { MqttService, PowerData } from '../mqtt/mqtt.service';
import { AggregationService } from '../aggregation/aggregation.service';
import { AlertService, AlertData, AlertSummary } from './alert.service';

@Controller('power')
export class PowerController {
  private readonly logger = new Logger(PowerController.name);

  constructor(
    private readonly powerService: PowerService,
    private readonly mqttService: MqttService,
    @Inject(AggregationService) private readonly aggregationService: AggregationService,
    private readonly alertService: AlertService,
    private readonly dataSource: DataSource, // ← TAMBAHAN UNTUK TEST
  ) {}

  // ================= MQTT CONTROL ENDPOINTS =================

  @Post('control')
  async controlPower(@Body('status') status: 'on' | 'off') {
    try {
      this.logger.log(`POST /power/control called with status: ${status}`);

      if (status !== 'on' && status !== 'off') {
        throw new HttpException(
          'Status must be "on" or "off"',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.mqttService.publishPowerControl(status);

      return {
        success: true,
        message: `Relay successfully set to ${status.toUpperCase()}`,
        status: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error controlling power:', error);
      throw new HttpException(
        error.message || 'Failed to control power',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reboot')
  async rebootDevice() {
    try {
      this.logger.log('POST /power/reboot called');
      this.mqttService.publishReboot();

      return {
        success: true,
        message: 'Reboot command sent to device',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error rebooting device:', error);
      throw new HttpException(
        'Failed to reboot device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  async getMqttStatus() {
    try {
      const isConnected = this.mqttService.isConnected();
      const bufferSize = this.mqttService.getBufferSize();
      
      return {
        mqtt_connected: isConnected,
        status: isConnected ? 'online' : 'offline',
        buffer_size: bufferSize,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting MQTT status:', error);
      return {
        mqtt_connected: false,
        status: 'error',
        buffer_size: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ================= ALERTS ENDPOINTS =================

  @Get('alerts/test')
  async testAlerts() {
    try {
      this.logger.log('🧪 TEST: Alert endpoint called');
      
      // Test 1: Count weekly_energy records
      const weeklyCountQuery = `SELECT COUNT(*) as count FROM weekly_energy`;
      const weeklyCount = await this.dataSource.query(weeklyCountQuery);
      
      // Test 2: Count daily_energy records
      const dailyCountQuery = `SELECT COUNT(*) as count FROM daily_energy`;
      const dailyCount = await this.dataSource.query(dailyCountQuery);
      
      // Test 3: Get sample from weekly_energy
      const weeklySampleQuery = `
        SELECT year, week, total_energy 
        FROM weekly_energy 
        ORDER BY year DESC, week DESC 
        LIMIT 3
      `;
      const weeklySample = await this.dataSource.query(weeklySampleQuery);
      
      // Test 4: Check if AlertService exists
      const alertServiceExists = this.alertService ? 'YES' : 'NO';
      
      // Test 5: Try to call AlertService method directly
      let alertTestResult = 'NOT_TESTED';
      try {
        const testAlerts = await this.alertService.generateAlertsFromLast10Days();
        alertTestResult = `SUCCESS - Generated ${testAlerts.length} alerts`;
      } catch (err) {
        alertTestResult = `FAILED - ${err.message}`;
      }
      
      return {
        success: true,
        message: 'Alert service diagnostic test',
        tests: {
          weekly_energy_count: parseInt(weeklyCount[0]?.count || '0'),
          daily_energy_count: parseInt(dailyCount[0]?.count || '0'),
          alert_service_exists: alertServiceExists,
          alert_generation_test: alertTestResult,
        },
        weekly_sample: weeklySample,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('🔴 Test error:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Get('alerts')
  async getAlerts(): Promise<{ success: boolean; data: AlertData[]; count: number; message: string; timestamp: string }> {
    try {
      this.logger.log('GET /power/alerts called');
      this.logger.log('Calling alertService.generateAlertsFromLast10Days()...');
      
      const alerts = await this.alertService.generateAlertsFromLast10Days();
      
      this.logger.log(`Received ${alerts.length} alerts from service`);
      
      return {
        success: true,
        data: alerts,
        count: alerts.length,
        message: 'Alerts generated from last 10 days of weekly data',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting alerts:', error);
      this.logger.error('Error stack:', error.stack);
      return {
        success: false,
        data: [],
        count: 0,
        message: `Failed to generate alerts: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('alerts/summary')
  async getAlertSummary(): Promise<{ success: boolean; data: AlertSummary | null; message?: string; timestamp: string }> {
    try {
      this.logger.log('GET /power/alerts/summary called');
      const summary = await this.alertService.getAlertSummary();
      
      return {
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting alert summary:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to get alert summary',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ================= REALTIME ENDPOINTS =================

  @Get('realtime')
  async getRealtime() {
    try {
      this.logger.log('GET /power/realtime called');
      
      const realtimeData = this.mqttService.getLatestRealtimeData();
      
      if (!realtimeData) {
        return {
          success: false,
          message: 'No realtime data available yet',
          data: null,
        };
      }

      return {
        success: true,
        data: {
          tegangan: realtimeData.tegangan,
          arus: realtimeData.arus,
          daya: realtimeData.daya,
          daya_watt: realtimeData.daya_watt,
          energi_kwh: realtimeData.energi_kwh,
          frekuensi: realtimeData.frekuensi,
          power_factor: realtimeData.power_factor,
          timestamp: realtimeData.timestamp,
        },
        buffer_size: this.mqttService.getBufferSize(),
      };
    } catch (error) {
      this.logger.error('Error getting realtime data:', error);
      return {
        success: false,
        message: 'Failed to get realtime data',
        data: null,
      };
    }
  }

  @Get('last7')
  async getLast7() {
    try {
      this.logger.log('GET /power/last7 called');
      const data = await this.powerService.getLast7();
      return {
        success: true,
        data: data,
        count: data.length,
      };
    } catch (error) {
      this.logger.error('Error in getLast7:', error);
      throw new HttpException(
        'Failed to fetch last 7 records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('latest')
  async getLatest() {
    try {
      this.logger.log('GET /power/latest called');
      const data = await this.powerService.getLatest();
      
      if (!data) {
        return {
          success: false,
          message: 'No data available',
          data: null,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      this.logger.error('Error in getLatest:', error);
      return {
        success: false,
        message: 'Failed to fetch latest record',
        data: null,
      };
    }
  }

  @Get('all')
  async getAll() {
    try {
      this.logger.log('GET /power/all called');
      const data = await this.powerService.findAll();
      return {
        success: true,
        data: data,
        count: data.length,
      };
    } catch (error) {
      this.logger.error('Error in getAll:', error);
      throw new HttpException(
        'Failed to fetch all records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async save(@Body() payload: any) {
    try {
      this.logger.log('POST /power called with payload:', payload);
      
      const saved = await this.powerService.saveToHourly({
        tegangan: payload.tegangan,
        arus: payload.arus,
        daya_watt: payload.daya_watt,
        energi_kwh: payload.energi_kwh,
        pf: payload.pf || payload.power_factor,
      });

      return {
        success: true,
        message: 'Data saved to hourly_energy',
        data: saved,
      };
    } catch (error) {
      this.logger.error('Error saving power data:', error);
      throw new HttpException(
        'Failed to save power data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ================= NEW: ALL DATA ENDPOINTS (NO TIME FILTER) =================

  @Get('hourly/all')
  async getAllHourlyData() {
    try {
      this.logger.log('GET /power/hourly/all called - fetching ALL hourly data');
      const data = await this.powerService.getAllHourlyData();
      this.logger.log(`Returning ${data.length} hourly records (ALL DATA)`);
      return {
        success: true,
        data: data,
        count: data.length,
        message: 'All hourly data from database (no time filter)',
      };
    } catch (error) {
      this.logger.error('Error in getAllHourlyData:', error);
      return {
        success: false,
        data: [],
        count: 0,
        message: 'Failed to fetch all hourly data',
      };
    }
  }

  @Get('daily/all')
  async getAllDailyData() {
    try {
      this.logger.log('GET /power/daily/all called - fetching ALL daily data');
      const data = await this.powerService.getAllDailyData();
      this.logger.log(`Returning ${data.length} daily records (ALL DATA)`);
      return {
        success: true,
        data: data,
        count: data.length,
        message: 'All daily data from database (no time filter)',
      };
    } catch (error) {
      this.logger.error('Error in getAllDailyData:', error);
      return {
        success: false,
        data: [],
        count: 0,
        message: 'Failed to fetch all daily data',
      };
    }
  }

  @Get('monthly/all')
  async getAllMonthlyData() {
    try {
      this.logger.log('GET /power/monthly/all called - fetching ALL monthly data');
      const data = await this.powerService.getAllMonthlyData();
      this.logger.log(`Returning ${data.length} monthly records (ALL DATA)`);
      return {
        success: true,
        data: data,
        count: data.length,
        message: 'All monthly data from database (no time filter)',
      };
    } catch (error) {
      this.logger.error('Error in getAllMonthlyData:', error);
      return {
        success: false,
        data: [],
        count: 0,
        message: 'Failed to fetch all monthly data',
      };
    }
  }

  // ================= STATISTICS ENDPOINTS =================

  @Get('statistics')
  async getStatistics(@Query('days') days?: string) {
    try {
      this.logger.log('GET /power/statistics called');
      const data = await this.powerService.getStatistics();
      this.logger.log('Statistics result:', data);
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      this.logger.error('Error in getStatistics:', error);
      return {
        success: false,
        data: {
          total_energy: 0,
          avg_daily_usage: 0,
          peak_usage: 0,
          peak_hour: '18:00',
          total_days: 0,
        },
      };
    }
  }

  // ================= REPORTS ENDPOINTS =================

  @Get('reports/monthly')
  async getMonthlyReports() {
    try {
      this.logger.log('GET /power/reports/monthly called');
      const data = await this.powerService.getMonthlyReports();
      this.logger.log(`Monthly reports: ${data.length} months`);
      return {
        success: true,
        data: data,
        count: data.length,
      };
    } catch (error) {
      this.logger.error('Error in getMonthlyReports:', error);
      return {
        success: false,
        data: [],
        count: 0,
      };
    }
  }

  @Get('reports/current-month')
  async getCurrentMonthReport() {
    try {
      this.logger.log('GET /power/reports/current-month called');
      const data = await this.powerService.getCurrentMonthReport();
      this.logger.log('Current month report:', data);
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      this.logger.error('Error in getCurrentMonthReport:', error);
      const now = new Date();
      return {
        success: false,
        data: {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          total_energy: 0,
          avg_daily_energy: 0,
          peak_date: null,
        },
      };
    }
  }

  // ================= ANALYSIS ENDPOINTS =================

  @Get('analysis/peak-usage')
  async getAnalysisPeakUsage() {
    try {
      this.logger.log('GET /power/analysis/peak-usage called');
      const data = await this.powerService.getAnalysisPeakUsage();
      this.logger.log(`Peak usage data: ${data.length} records`);
      
      // ✅ Return array langsung, bukan wrapped
      return data;
    } catch (error) {
      this.logger.error('Error in getAnalysisPeakUsage:', error);
      return [];
    }
  }

  @Get('analysis/load-pattern')
  async getLoadPattern() {
    try {
      this.logger.log('GET /power/analysis/load-pattern called');
      const data = await this.powerService.getLoadPattern();
      this.logger.log(`Load pattern data: ${data.length} days`);
      
      // ✅ Return array langsung, bukan wrapped
      return data;
    } catch (error) {
      this.logger.error('Error in getLoadPattern:', error);
      return [];
    }
  }

  @Get('analysis/power-factor')
  async getPowerFactorAverage() {
    try {
      this.logger.log('GET /power/analysis/power-factor called');
      const data = await this.powerService.getPowerFactorAverage();
      this.logger.log(`Power factor: ${data}`);
      
      // ✅ Return object dengan power_factor
      return {
        power_factor: data,
      };
    } catch (error) {
      this.logger.error('Error in getPowerFactorAverage:', error);
      return {
        power_factor: 0.95,
      };
    }
  }

  // ================= UTILITY ENDPOINTS =================

  @Get('range')
  async getRange(@Query('start') start: string, @Query('end') end: string) {
    try {
      this.logger.log('GET /power/range called');
      
      if (!start || !end) {
        throw new HttpException(
          'Start and end dates are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const data = await this.powerService.findByDateRange(
        new Date(start),
        new Date(end),
      );

      return {
        success: true,
        data: data,
        count: data.length,
      };
    } catch (error) {
      this.logger.error('Error in getRange:', error);
      throw new HttpException(
        error.message || 'Failed to fetch date range',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ================= MQTT BUFFER MANAGEMENT ENDPOINTS =================

  @Post('mqtt/save-now')
  async saveBufferedDataNow() {
    try {
      this.logger.log('POST /power/mqtt/save-now called');
      await this.mqttService.saveNow();
      
      return {
        success: true,
        message: 'Buffered MQTT data saved to database successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error saving buffered data:', error);
      throw new HttpException(
        'Failed to save buffered data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('mqtt/buffer')
  async getBufferedData(): Promise<{ success: boolean; data: PowerData[]; count: number; message: string; timestamp: string }> {
    try {
      this.logger.log('GET /power/mqtt/buffer called');
      const data = this.mqttService.getBufferedData();
      
      return {
        success: true,
        data: data,
        count: data.length,
        message: data.length > 0 
          ? `${data.length} records in buffer waiting to be saved` 
          : 'Buffer is empty',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting buffered data:', error);
      return {
        success: false,
        data: [],
        count: 0,
        message: 'Failed to get buffered data',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('mqtt/buffer/stats')
  async getBufferStats() {
    try {
      this.logger.log('GET /power/mqtt/buffer/stats called');
      const bufferData = this.mqttService.getBufferedData();
      const bufferSize = this.mqttService.getBufferSize();
      const isConnected = this.mqttService.isConnected();

      let avgVoltage = 0;
      let avgCurrent = 0;
      let avgPower = 0;
      let avgEnergy = 0;

      if (bufferData.length > 0) {
        const sum = bufferData.reduce((acc, data) => ({
          voltage: acc.voltage + data.tegangan,
          current: acc.current + data.arus,
          power: acc.power + data.daya_watt,
          energy: acc.energy + data.energi_kwh,
        }), { voltage: 0, current: 0, power: 0, energy: 0 });

        const count = bufferData.length;
        avgVoltage = parseFloat((sum.voltage / count).toFixed(2));
        avgCurrent = parseFloat((sum.current / count).toFixed(3));
        avgPower = parseFloat((sum.power / count).toFixed(2));
        avgEnergy = parseFloat((sum.energy / count).toFixed(4));
      }

      return {
        success: true,
        data: {
          buffer_size: bufferSize,
          mqtt_connected: isConnected,
          status: isConnected ? 'online' : 'offline',
          average: {
            voltage: avgVoltage,
            current: avgCurrent,
            power: avgPower,
            energy: avgEnergy,
          },
          oldest_timestamp: bufferData.length > 0 ? bufferData[0].timestamp : null,
          latest_timestamp: bufferData.length > 0 ? bufferData[bufferData.length - 1].timestamp : null,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting buffer stats:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to get buffer statistics',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ================= MANUAL AGGREGATION ENDPOINTS =================

  @Post('aggregate/daily')
  async triggerDailyAggregation(@Query('date') date?: string) {
    try {
      this.logger.log('POST /power/aggregate/daily called');
      
      const targetDate = date ? new Date(date) : undefined;
      const result = await this.aggregationService.aggregateDailyManual(targetDate);
      
      return {
        success: true,
        message: 'Daily aggregation triggered successfully',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in daily aggregation:', error);
      throw new HttpException(
        'Failed to trigger daily aggregation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('aggregate/weekly')
  async triggerWeeklyAggregation() {
    try {
      this.logger.log('POST /power/aggregate/weekly called');
      await this.aggregationService.aggregateWeekly();
      
      return {
        success: true,
        message: 'Weekly aggregation triggered successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in weekly aggregation:', error);
      throw new HttpException(
        'Failed to trigger weekly aggregation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('aggregate/monthly')
  async triggerMonthlyAggregation() {
    try {
      this.logger.log('POST /power/aggregate/monthly called');
      await this.aggregationService.aggregateMonthly();
      
      return {
        success: true,
        message: 'Monthly aggregation triggered successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in monthly aggregation:', error);
      throw new HttpException(
        'Failed to trigger monthly aggregation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('aggregate/all')
  async triggerAllAggregations() {
    try {
      this.logger.log('POST /power/aggregate/all called');
      await this.aggregationService.runAllAggregations();
      
      return {
        success: true,
        message: 'All aggregations triggered successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in all aggregations:', error);
      throw new HttpException(
        'Failed to trigger all aggregations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ================= HEALTH CHECK =================

  @Get('health')
  async healthCheck() {
    try {
      const mqttConnected = this.mqttService.isConnected();
      const bufferSize = this.mqttService.getBufferSize();
      const latestData = await this.powerService.getLatest();
      const realtimeData = this.mqttService.getLatestRealtimeData();

      return {
        success: true,
        status: 'healthy',
        mqtt: {
          connected: mqttConnected,
          buffer_size: bufferSize,
          has_realtime_data: realtimeData !== null,
        },
        database: {
          has_data: latestData !== null,
          latest_timestamp: latestData?.created_at || null,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in health check:', error);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}