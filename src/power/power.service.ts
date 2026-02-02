import { Injectable } from '@nestjs/common';
import { DataSource, Between } from 'typeorm';
import { PowerLog } from './power.entity';

@Injectable()
export class PowerService {
  constructor(private readonly dataSource: DataSource) {}

  // ================= REALTIME - AMBIL 7 DATA TERAKHIR =================

  /**
   * GET /power/last7
   * Ambil 7 data terakhir dari power_logs untuk dashboard & realtime monitoring
   * Data diurutkan dari oldest to newest (chronological order)
   */
  async getLast7(): Promise<PowerLog[]> {
    const data = await this.dataSource.getRepository(PowerLog).find({
      order: { created_at: 'DESC' },
      take: 7,
    });
    
    // Reverse to show oldest to newest (left to right on charts)
    return data.reverse();
  }

  /**
   * GET /power/latest
   * Ambil 1 data terbaru untuk current metrics
   */
  async getLatest(): Promise<PowerLog | null> {
    const result = await this.dataSource.getRepository(PowerLog).findOne({
      order: { created_at: 'DESC' },
    });
    return result;
  }

  /**
   * POST /power
   * Save new power data
   */
  async save(payload: Partial<PowerLog>) {
    const repo = this.dataSource.getRepository(PowerLog);
    const power = repo.create(payload);
    return repo.save(power);
  }

  // ================= HISTORY - UNTUK HISTORY PAGE =================

  /**
   * GET /power/daily
   * Data hourly untuk 24 jam terakhir dari hourly_energy table
   */
  async getDailyData(): Promise<any[]> {
    console.log('🔍 [DAILY] Fetching hourly data from hourly_energy table...');
    
    const query = `
      SELECT 
        DATE_FORMAT(timestamp, '%H:%i') as time,
        HOUR(timestamp) as hour,
        ROUND(energy, 2) as energy,
        ROUND(voltage, 2) as voltage,
        ROUND(current, 2) as current,
        ROUND(power_factor, 2) as power_factor,
        timestamp
      FROM hourly_energy 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY timestamp ASC
    `;

    const data = await this.dataSource.query(query);
    console.log('✅ [DAILY] Found', data.length, 'hourly records');

    return data.map((row: any) => ({
      time: row.time,
      hour: row.hour,
      energy: parseFloat(row.energy || 0),
      voltage: parseFloat(row.voltage || 220),
      current: parseFloat(row.current || 0),
      power_factor: parseFloat(row.power_factor || 0.95),
      timestamp: row.timestamp,
    }));
  }

  /**
   * GET /power/weekly
   * Data 7 hari terakhir dari daily_energy table
   */
  async getWeeklyData(): Promise<any[]> {
    console.log('🔍 [WEEKLY] Fetching 7 days data from daily_energy table...');
    
    const query = `
      SELECT 
        DATE_FORMAT(date, '%a') as day_name,
        ROUND(total_energy, 2) as energy,
        ROUND(avg_energy, 2) as avg_energy,
        ROUND(max_energy, 2) as max_energy,
        ROUND(min_energy, 2) as min_energy,
        date
      FROM daily_energy 
      ORDER BY date DESC
      LIMIT 7
    `;

    const data = await this.dataSource.query(query);
    console.log('✅ [WEEKLY] Found', data.length, 'daily records');

    // Reverse to show oldest to newest
    return data.reverse().map((row: any) => ({
      time: row.day_name,
      energy: parseFloat(row.energy || 0),
      avg_energy: parseFloat(row.avg_energy || 0),
      max_energy: parseFloat(row.max_energy || 0),
      min_energy: parseFloat(row.min_energy || 0),
      date: row.date,
    }));
  }

  /**
   * GET /power/monthly
   * Data 30 hari terakhir dari daily_energy table
   */
  async getMonthlyData(): Promise<any[]> {
    console.log('🔍 [MONTHLY] Fetching 30 days data from daily_energy table...');
    
    const query = `
      SELECT 
        date,
        ROUND(total_energy, 2) as energy,
        ROUND(avg_energy, 2) as avg_energy,
        DAY(date) as day_num
      FROM daily_energy 
      ORDER BY date DESC
      LIMIT 30
    `;

    const data = await this.dataSource.query(query);
    console.log('✅ [MONTHLY] Found', data.length, 'daily records');

    // Reverse to show oldest to newest
    return data.reverse().map((row: any, index: number) => ({
      time: `Day ${index + 1}`,
      energy: parseFloat(row.energy || 0),
      avg_energy: parseFloat(row.avg_energy || 0),
      date: row.date,
      day: row.day_num,
    }));
  }

  async getStatistics(days = 30): Promise<any> {
    console.log(`🔍 [STATISTICS] Fetching stats for last ${days} days...`);
    
    const statsQuery = `
      SELECT 
        COALESCE(SUM(total_energy), 0) as total_energy,
        COALESCE(AVG(total_energy), 0) as avg_daily,
        COALESCE(MAX(total_energy), 0) as peak
      FROM daily_energy 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `;

    const stats = await this.dataSource.query(statsQuery, [days]);

    const peakHourQuery = `
      SELECT 
        DATE_FORMAT(timestamp, '%H:00') as peak_hour,
        energy
      FROM hourly_energy 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY energy DESC
      LIMIT 1
    `;

    const peakHour = await this.dataSource.query(peakHourQuery);

    const result = {
      total_energy: parseFloat(Number(stats[0]?.total_energy || 0).toFixed(2)),
      avg_daily_usage: parseFloat(Number(stats[0]?.avg_daily || 0).toFixed(2)),
      peak_usage: parseFloat(Number(stats[0]?.peak || 0).toFixed(2)),
      peak_hour: peakHour[0]?.peak_hour || '18:00',
    };

    console.log('✅ [STATISTICS] Result:', result);
    return result;
  }

  // ================= REPORTS =================

  async getMonthlyReports(): Promise<any[]> {
    console.log('🔍 [REPORTS] Fetching monthly reports...');
    
    const query = `
      SELECT 
        month,
        year,
        ROUND(total_energy, 2) as total_energy,
        ROUND(avg_daily_energy, 2) as avg_daily_energy,
        peak_date,
        CONCAT(year, '-', LPAD(month, 2, '0')) as period
      FROM monthly_energy 
      ORDER BY year DESC, month DESC
      LIMIT 12
    `;

    const data = await this.dataSource.query(query);
    console.log('✅ [REPORTS] Found', data.length, 'monthly records');

    return data.map((row: any) => ({
      month: row.month,
      year: row.year,
      period: row.period,
      total_energy: parseFloat(row.total_energy || 0),
      avg_daily_energy: parseFloat(row.avg_daily_energy || 0),
      peak_date: row.peak_date,
    }));
  }

  async getCurrentMonthReport(): Promise<any> {
    console.log('🔍 [REPORTS] Fetching current month report...');
    
    const query = `
      SELECT 
        month,
        year,
        ROUND(total_energy, 2) as total_energy,
        ROUND(avg_daily_energy, 2) as avg_daily_energy,
        peak_date
      FROM monthly_energy 
      WHERE month = MONTH(CURDATE()) 
      AND year = YEAR(CURDATE())
      LIMIT 1
    `;

    const data = await this.dataSource.query(query);
    
    if (data.length === 0) {
      return {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        total_energy: 0,
        avg_daily_energy: 0,
        peak_date: null,
      };
    }

    const row = data[0];
    return {
      month: row.month,
      year: row.year,
      total_energy: parseFloat(row.total_energy || 0),
      avg_daily_energy: parseFloat(row.avg_daily_energy || 0),
      peak_date: row.peak_date,
    };
  }

  // ================= ANALYSIS - POWER ANALYSIS PAGE =================

  async getAnalysisPeakUsage(): Promise<any[]> {
    console.log('🔍 [ANALYSIS-PEAK] Fetching 7 latest hourly records...');
    
    const query = `
      SELECT 
        DATE_FORMAT(timestamp, '%H:%i') as time,
        ROUND(energy * 1000, 0) as power_watt,
        ROUND(voltage, 2) as voltage,
        ROUND(current, 2) as current,
        ROUND(power_factor, 2) as power_factor,
        timestamp
      FROM hourly_energy 
      ORDER BY timestamp DESC
      LIMIT 7
    `;

    const data = await this.dataSource.query(query);
    console.log('✅ [ANALYSIS-PEAK] Found', data.length, 'records');

    return data.reverse().map((row: any) => ({
      time: row.time,
      usage: Math.round(parseFloat(row.power_watt || 0)),
      voltage: parseFloat(row.voltage || 220),
      current: parseFloat(row.current || 0),
      power_factor: parseFloat(row.power_factor || 0.95),
      timestamp: row.timestamp,
    }));
  }

  async getLoadPattern(): Promise<any[]> {
    console.log('🔍 [ANALYSIS-LOAD] Fetching 7 latest days from daily_energy...');
    
    const query = `
      SELECT 
        DATE_FORMAT(date, '%a') as day_name,
        ROUND(total_energy, 2) as total_energy,
        date,
        DAYOFWEEK(date) as day_of_week
      FROM daily_energy 
      ORDER BY date DESC
      LIMIT 7
    `;

    const data = await this.dataSource.query(query);
    console.log('✅ [ANALYSIS-LOAD] Found', data.length, 'daily records');

    if (data.length === 0) return [];

    const reversedData = data.reverse();

    return reversedData.map((row: any) => {
      const totalEnergyKwh = parseFloat(row.total_energy || 0);
      const avgWattPerHour = (totalEnergyKwh * 1000) / 24;
      
      const isWeekend = row.day_of_week === 1 || row.day_of_week === 7;
      const weekendMultiplier = isWeekend ? 1.15 : 1.0;
      
      const morning = Math.round(avgWattPerHour * 0.60 * weekendMultiplier);
      const afternoon = Math.round(avgWattPerHour * 0.80 * weekendMultiplier);
      const evening = Math.round(avgWattPerHour * 1.30 * weekendMultiplier);
      
      return {
        day: row.day_name,
        morning: morning,
        afternoon: afternoon,
        evening: evening,
        date: row.date,
        total_energy: totalEnergyKwh,
      };
    });
  }

  async getPowerFactorAverage(): Promise<number> {
    console.log('🔍 [ANALYSIS-PF] Fetching power factor average...');
    
    const query = `
      SELECT 
        AVG(power_factor) as avg_pf
      FROM hourly_energy 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    const data = await this.dataSource.query(query);
    const powerFactor = parseFloat(Number(data[0]?.avg_pf || 0.95).toFixed(2));
    
    console.log('✅ [ANALYSIS-PF] Power Factor:', powerFactor);
    return powerFactor;
  }

  async findByDateRange(start: Date, end: Date): Promise<PowerLog[]> {
    return this.dataSource.getRepository(PowerLog).find({
      where: { created_at: Between(start, end) },
      order: { created_at: 'ASC' },
    });
  }

  async findAll(): Promise<PowerLog[]> {
    return this.dataSource.getRepository(PowerLog).find({
      order: { created_at: 'ASC' },
      take: 1000,
    });
  }
}