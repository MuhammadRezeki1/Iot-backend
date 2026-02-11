import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { DataSource, Between } from 'typeorm';
import { HourlyEnergy } from './hourly-energy.entity';
import { DailyEnergy } from './Dailyenergy.entity';
import { MonthlyEnergy } from './Monthlyenergy.entity';
import { PowerLog } from './power.entity';

@Injectable()
export class PowerService {
  private readonly logger = new Logger(PowerService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ================= HELPER: Safe Number Conversion =================
  private safeNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  private safeFloat(value: any, decimals: number = 2, defaultValue: number = 0): number {
    return parseFloat(this.safeNumber(value, defaultValue).toFixed(decimals));
  }

  // ================= SAVE TO HOURLY ENERGY =================
  
  async saveToHourly(payload: {
    tegangan?: number;
    arus?: number;
    daya_watt?: number;
    energi_kwh?: number;
    pf?: number;
  }): Promise<HourlyEnergy> {
    try {
      const repo = this.dataSource.getRepository(HourlyEnergy);
      
      const intervalHours = 1 / 60;
      let energy = this.safeFloat(payload.energi_kwh, 4);
      
      if (!energy && payload.daya_watt) {
        energy = (payload.daya_watt * intervalHours) / 1000;
      }

      const hourlyData = repo.create({
        timestamp: new Date(),
        energy: energy,
        voltage: this.safeFloat(payload.tegangan, 2, 220),
        current: this.safeFloat(payload.arus, 3),
        power_factor: this.safeFloat(payload.pf, 2, 0.95),
      });

      const saved = await repo.save(hourlyData);
      
      this.logger.log(
        `✅ Data saved to hourly_energy | ID: ${saved.id} | ` +
        `V: ${saved.voltage}V | I: ${saved.current}A | ` +
        `E: ${saved.energy}kWh | PF: ${saved.power_factor}`
      );
      
      return saved;
    } catch (error) {
      this.logger.error('❌ Error saving to hourly_energy:', error);
      throw new InternalServerErrorException('Failed to save hourly data');
    }
  }

  async save(payload: Partial<PowerLog>) {
    return this.saveToHourly({
      tegangan: payload.tegangan,
      arus: payload.arus,
      daya_watt: payload.daya_watt,
      energi_kwh: payload.energi_kwh,
      pf: payload.pf,
    });
  }

  // ================= REALTIME - AMBIL 7 DATA TERAKHIR =================

  async getLast7(): Promise<any[]> {
    try {
      this.logger.log('Fetching last 7 records from hourly_energy');
      
      const data = await this.dataSource.getRepository(HourlyEnergy).find({
        order: { timestamp: 'DESC' },
        take: 7,
      });
      
      this.logger.log(`Found ${data.length} records`);
      
      return data.reverse().map(item => ({
        id: item.id,
        tegangan: this.safeFloat(item.voltage, 2, 220),
        arus: this.safeFloat(item.current, 3),
        daya_watt: this.safeFloat(item.voltage * item.current * item.power_factor, 2),
        energi_kwh: this.safeFloat(item.energy, 4),
        pf: this.safeFloat(item.power_factor, 2, 0.95),
        created_at: item.timestamp,
      }));
    } catch (error) {
      this.logger.error('Error fetching last 7 records:', error);
      throw new InternalServerErrorException('Failed to fetch last 7 records');
    }
  }

  async getLatest(): Promise<any | null> {
    try {
      const result = await this.dataSource.getRepository(HourlyEnergy).findOne({
        order: { timestamp: 'DESC' },
      });
      
      if (!result) return null;

      return {
        id: result.id,
        tegangan: this.safeFloat(result.voltage, 2, 220),
        arus: this.safeFloat(result.current, 3),
        daya_watt: this.safeFloat(result.voltage * result.current * result.power_factor, 2),
        energi_kwh: this.safeFloat(result.energy, 4),
        pf: this.safeFloat(result.power_factor, 2, 0.95),
        created_at: result.timestamp,
      };
    } catch (error) {
      this.logger.error('Error fetching latest record:', error);
      return null;
    }
  }

  // ================= HISTORY - SEMUA DATA TANPA FILTER =================

  /**
   * Ambil semua data hourly tanpa filter waktu
   * Diurutkan dari terlama ke terbaru
   */
  async getAllHourlyData(): Promise<any[]> {
    try {
      this.logger.log('Fetching ALL hourly data from hourly_energy (no time filter)');
      
      const data = await this.dataSource.getRepository(HourlyEnergy).find({
        order: { timestamp: 'ASC' },
      });

      this.logger.log(`Found ${data.length} total hourly records`);

      return data.map((row: any) => ({
        time: new Date(row.timestamp).toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        hour: new Date(row.timestamp).getHours(),
        energy: this.safeFloat(row.energy, 4),
        voltage: this.safeFloat(row.voltage, 1, 220),
        current: this.safeFloat(row.current, 3),
        power_factor: this.safeFloat(row.power_factor, 2, 0.95),
        timestamp: row.timestamp,
      }));
    } catch (error) {
      this.logger.error('Error fetching all hourly data:', error.message);
      return [];
    }
  }

  /**
   * Ambil semua data daily tanpa filter waktu
   */
  async getAllDailyData(): Promise<any[]> {
    try {
      this.logger.log('Fetching ALL daily data from daily_energy (no time filter)');
      
      const data = await this.dataSource.getRepository(DailyEnergy).find({
        order: { date: 'ASC' },
      });
      
      this.logger.log(`Found ${data.length} total daily records`);

      return data.map((row: any) => ({
        time: new Date(row.date).toLocaleDateString('id-ID', { 
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        day_name: new Date(row.date).toLocaleDateString('id-ID', { weekday: 'short' }),
        energy: this.safeFloat(row.total_energy),
        total_energy: this.safeFloat(row.total_energy),
        avg_energy: this.safeFloat(row.avg_energy),
        max_energy: this.safeFloat(row.max_energy),
        min_energy: this.safeFloat(row.min_energy),
        date: row.date,
      }));
    } catch (error) {
      this.logger.error('Error fetching all daily data:', error.message);
      return [];
    }
  }

  /**
   * Ambil semua data monthly tanpa filter waktu
   */
  async getAllMonthlyData(): Promise<any[]> {
    try {
      this.logger.log('Fetching ALL monthly data from monthly_energy (no time filter)');
      
      const data = await this.dataSource.getRepository(MonthlyEnergy).find({
        order: { 
          year: 'ASC',
          month: 'ASC' 
        },
      });

      this.logger.log(`Found ${data.length} total monthly records`);

      return data.map((row: any, index: number) => ({
        time: `${this.getMonthName(row.month)} ${row.year}`,
        month: this.safeNumber(row.month),
        year: this.safeNumber(row.year),
        energy: this.safeFloat(row.total_energy),
        total_energy: this.safeFloat(row.total_energy),
        avg_daily_energy: this.safeFloat(row.avg_daily_energy),
        peak_date: row.peak_date,
      }));
    } catch (error) {
      this.logger.error('Error fetching all monthly data:', error.message);
      return [];
    }
  }

  /**
   * Helper untuk nama bulan
   */
  private getMonthName(month: number): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1] || 'Unknown';
  }

  // ================= STATISTICS - DARI SEMUA DATA =================

  async getStatistics(days?: number): Promise<any> {
    try {
      this.logger.log('Fetching statistics from ALL data');
      
      // Hitung dari semua data daily_energy
      const statsQuery = `
        SELECT 
          COALESCE(SUM(total_energy), 0) as total_energy,
          COALESCE(AVG(total_energy), 0) as avg_daily,
          COALESCE(MAX(total_energy), 0) as peak,
          COUNT(*) as total_days
        FROM daily_energy
      `;

      const stats = await this.dataSource.query(statsQuery);

      // Peak hour dari hourly_energy
      const peakHourQuery = `
        SELECT 
          TO_CHAR(timestamp, 'HH24:00') as peak_hour,
          COALESCE(energy, 0) as energy
        FROM hourly_energy 
        ORDER BY energy DESC
        LIMIT 1
      `;

      const peakHour = await this.dataSource.query(peakHourQuery);

      const result = {
        total_energy: this.safeFloat(stats[0]?.total_energy, 2, 0),
        avg_daily_usage: this.safeFloat(stats[0]?.avg_daily, 2, 0),
        peak_usage: this.safeFloat(stats[0]?.peak, 2, 0),
        peak_hour: peakHour[0]?.peak_hour || '18:00',
        total_days: this.safeNumber(stats[0]?.total_days, 0),
      };

      this.logger.log('Statistics result:', result);
      return result;
    } catch (error) {
      this.logger.error('Error fetching statistics:', error.message);
      return {
        total_energy: 0,
        avg_daily_usage: 0,
        peak_usage: 0,
        peak_hour: '18:00',
        total_days: 0,
      };
    }
  }

  // ================= REPORTS =================

  async getMonthlyReports(): Promise<any[]> {
    try {
      this.logger.log('Fetching ALL monthly reports');
      
      const data = await this.dataSource.getRepository(MonthlyEnergy).find({
        order: { 
          year: 'DESC',
          month: 'DESC' 
        },
      });
      
      this.logger.log(`Found ${data.length} monthly records`);

      return data.map((row: any) => ({
        month: this.safeNumber(row.month),
        year: this.safeNumber(row.year),
        period: `${row.year}-${String(row.month).padStart(2, '0')}`,
        total_energy: this.safeFloat(row.total_energy),
        avg_daily_energy: this.safeFloat(row.avg_daily_energy),
        peak_date: row.peak_date,
      }));
    } catch (error) {
      this.logger.error('Error fetching monthly reports:', error.message);
      return [];
    }
  }

  async getCurrentMonthReport(): Promise<any> {
    try {
      this.logger.log('Fetching current month report');
      
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const data = await this.dataSource.getRepository(MonthlyEnergy).findOne({
        where: {
          month: currentMonth,
          year: currentYear,
        },
      });
      
      if (!data) {
        return {
          month: currentMonth,
          year: currentYear,
          total_energy: 0,
          avg_daily_energy: 0,
          peak_date: null,
        };
      }

      return {
        month: this.safeNumber(data.month),
        year: this.safeNumber(data.year),
        total_energy: this.safeFloat(data.total_energy),
        avg_daily_energy: this.safeFloat(data.avg_daily_energy),
        peak_date: data.peak_date,
      };
    } catch (error) {
      this.logger.error('Error fetching current month report:', error.message);
      const now = new Date();
      return {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        total_energy: 0,
        avg_daily_energy: 0,
        peak_date: null,
      };
    }
  }

  // ================= ANALYSIS =================

  async getAnalysisPeakUsage(): Promise<any[]> {
    try {
      this.logger.log('Fetching peak usage data');
      
      const data = await this.dataSource.getRepository(HourlyEnergy).find({
        order: { energy: 'DESC' },
        take: 10,
      });

      this.logger.log(`Found ${data.length} peak usage records`);

      return data.map((row: any) => ({
        time: new Date(row.timestamp).toLocaleString('id-ID'),
        usage: this.safeNumber(row.energy * 1000),
        voltage: this.safeFloat(row.voltage, 2, 220),
        current: this.safeFloat(row.current, 3),
        power_factor: this.safeFloat(row.power_factor, 2, 0.95),
        timestamp: row.timestamp,
      }));
    } catch (error) {
      this.logger.error('Error fetching peak usage:', error.message);
      return [];
    }
  }

  async getLoadPattern(): Promise<any[]> {
    try {
      this.logger.log('Fetching load pattern data from ALL daily data');
      
      const data = await this.dataSource.getRepository(DailyEnergy).find({
        order: { date: 'DESC' },
        take: 30,
      });

      this.logger.log(`Found ${data.length} load pattern records`);

      if (data.length === 0) return [];

      const reversedData = data.reverse();

      return reversedData.map((row: any) => {
        const totalEnergyKwh = this.safeFloat(row.total_energy);
        const avgWattPerHour = (totalEnergyKwh * 1000) / 24;
        
        const date = new Date(row.date);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weekendMultiplier = isWeekend ? 1.15 : 1.0;
        
        const morning = Math.round(avgWattPerHour * 0.60 * weekendMultiplier);
        const afternoon = Math.round(avgWattPerHour * 0.80 * weekendMultiplier);
        const evening = Math.round(avgWattPerHour * 1.30 * weekendMultiplier);
        
        return {
          day: date.toLocaleDateString('id-ID', { weekday: 'short' }),
          morning: morning,
          afternoon: afternoon,
          evening: evening,
          date: row.date,
          total_energy: totalEnergyKwh,
        };
      });
    } catch (error) {
      this.logger.error('Error fetching load pattern:', error.message);
      return [];
    }
  }

  async getPowerFactorAverage(): Promise<number> {
    try {
      this.logger.log('Fetching power factor average from ALL data');
      
      const query = `
        SELECT 
          COALESCE(AVG(power_factor), 0.95) as avg_pf
        FROM hourly_energy
      `;

      const data = await this.dataSource.query(query);
      const powerFactor = this.safeFloat(data[0]?.avg_pf, 2, 0.95);
      
      this.logger.log(`Power Factor: ${powerFactor}`);
      return powerFactor;
    } catch (error) {
      this.logger.error('Error fetching power factor:', error.message);
      return 0.95;
    }
  }

  async findByDateRange(start: Date, end: Date): Promise<any[]> {
    try {
      const data = await this.dataSource.getRepository(HourlyEnergy).find({
        where: { timestamp: Between(start, end) },
        order: { timestamp: 'ASC' },
      });

      return data.map(item => ({
        id: item.id,
        tegangan: this.safeFloat(item.voltage, 2, 220),
        arus: this.safeFloat(item.current, 3),
        daya_watt: this.safeFloat(item.voltage * item.current * item.power_factor, 2),
        energi_kwh: this.safeFloat(item.energy, 4),
        pf: this.safeFloat(item.power_factor, 2, 0.95),
        created_at: item.timestamp,
      }));
    } catch (error) {
      this.logger.error('Error fetching date range:', error);
      return [];
    }
  }

  async findAll(): Promise<any[]> {
    try {
      const data = await this.dataSource.getRepository(HourlyEnergy).find({
        order: { timestamp: 'ASC' },
      });

      return data.map(item => ({
        id: item.id,
        tegangan: this.safeFloat(item.voltage, 2, 220),
        arus: this.safeFloat(item.current, 3),
        daya_watt: this.safeFloat(item.voltage * item.current * item.power_factor, 2),
        energi_kwh: this.safeFloat(item.energy, 4),
        pf: this.safeFloat(item.power_factor, 2, 0.95),
        created_at: item.timestamp,
      }));
    } catch (error) {
      this.logger.error('Error fetching all records:', error);
      return [];
    }
  }
}