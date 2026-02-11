import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { DailyEnergy } from '../power/Dailyenergy.entity';
import { WeeklyEnergy } from '../power/Weeklyenergy.entity';
import { MonthlyEnergy } from '../power/Monthlyenergy.entity';

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ================= AGGREGATE HOURLY → DAILY =================
  
  /**
   * Jalankan setiap hari jam 00:01 untuk agregasi data kemarin
   */
  @Cron('1 0 * * *')
  async aggregateDaily() {
    this.logger.log('🔄 Starting daily aggregation...');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const query = `
        INSERT INTO daily_energy (date, total_energy, avg_energy, max_energy, min_energy, created_at)
        SELECT 
          DATE(timestamp) as date,
          COALESCE(SUM(energy), 0) as total_energy,
          COALESCE(AVG(energy), 0) as avg_energy,
          COALESCE(MAX(energy), 0) as max_energy,
          COALESCE(MIN(energy), 0) as min_energy,
          NOW() as created_at
        FROM hourly_energy
        WHERE DATE(timestamp) = ?
        GROUP BY DATE(timestamp)
        ON DUPLICATE KEY UPDATE
          total_energy = VALUES(total_energy),
          avg_energy = VALUES(avg_energy),
          max_energy = VALUES(max_energy),
          min_energy = VALUES(min_energy)
      `;

      await this.dataSource.query(query, [dateStr]);
      this.logger.log(`✅ Daily aggregation completed for ${dateStr}`);
    } catch (error) {
      this.logger.error('❌ Error in daily aggregation:', error.message);
    }
  }

  /**
   * Manual trigger untuk agregasi daily
   */
  async aggregateDailyManual(date?: Date) {
    const targetDate = date || new Date();
    targetDate.setDate(targetDate.getDate() - 1);
    const dateStr = targetDate.toISOString().split('T')[0];

    this.logger.log(`🔄 Manual daily aggregation for ${dateStr}`);

    try {
      const query = `
        INSERT INTO daily_energy (date, total_energy, avg_energy, max_energy, min_energy, created_at)
        SELECT 
          DATE(timestamp) as date,
          COALESCE(SUM(energy), 0) as total_energy,
          COALESCE(AVG(energy), 0) as avg_energy,
          COALESCE(MAX(energy), 0) as max_energy,
          COALESCE(MIN(energy), 0) as min_energy,
          NOW() as created_at
        FROM hourly_energy
        WHERE DATE(timestamp) = ?
        GROUP BY DATE(timestamp)
        ON DUPLICATE KEY UPDATE
          total_energy = VALUES(total_energy),
          avg_energy = VALUES(avg_energy),
          max_energy = VALUES(max_energy),
          min_energy = VALUES(min_energy)
      `;

      const result = await this.dataSource.query(query, [dateStr]);
      this.logger.log(`✅ Manual daily aggregation completed: ${JSON.stringify(result)}`);
      return { success: true, date: dateStr };
    } catch (error) {
      this.logger.error('❌ Error in manual daily aggregation:', error.message);
      throw error;
    }
  }

  // ================= AGGREGATE DAILY → WEEKLY =================
  
  /**
   * Jalankan setiap Senin jam 00:05 untuk agregasi minggu lalu
   */
  @Cron('5 0 * * 1')
  async aggregateWeekly() {
    this.logger.log('🔄 Starting weekly aggregation...');
    
    try {
      const query = `
        INSERT INTO weekly_energy (year, week, total_energy, avg_daily_energy, peak_date, created_at)
        SELECT 
          YEAR(date) as year,
          WEEK(date, 1) as week,
          COALESCE(SUM(total_energy), 0) as total_energy,
          COALESCE(AVG(total_energy), 0) as avg_daily_energy,
          (SELECT date FROM daily_energy de2 
           WHERE YEAR(de2.date) = YEAR(date) 
           AND WEEK(de2.date, 1) = WEEK(date, 1)
           ORDER BY total_energy DESC LIMIT 1) as peak_date,
          NOW() as created_at
        FROM daily_energy
        WHERE YEARWEEK(date, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)
        GROUP BY YEAR(date), WEEK(date, 1)
        ON DUPLICATE KEY UPDATE
          total_energy = VALUES(total_energy),
          avg_daily_energy = VALUES(avg_daily_energy),
          peak_date = VALUES(peak_date)
      `;

      await this.dataSource.query(query);
      this.logger.log('✅ Weekly aggregation completed');
    } catch (error) {
      this.logger.error('❌ Error in weekly aggregation:', error.message);
    }
  }

  // ================= AGGREGATE DAILY → MONTHLY =================
  
  /**
   * Jalankan setiap tanggal 1 jam 00:10 untuk agregasi bulan lalu
   */
  @Cron('10 0 1 * *')
  async aggregateMonthly() {
    this.logger.log('🔄 Starting monthly aggregation...');
    
    try {
      const query = `
        INSERT INTO monthly_energy (month, year, total_energy, avg_daily_energy, peak_date, created_at)
        SELECT 
          MONTH(date) as month,
          YEAR(date) as year,
          COALESCE(SUM(total_energy), 0) as total_energy,
          COALESCE(AVG(total_energy), 0) as avg_daily_energy,
          (SELECT date FROM daily_energy de2 
           WHERE YEAR(de2.date) = YEAR(date) 
           AND MONTH(de2.date) = MONTH(date)
           ORDER BY total_energy DESC LIMIT 1) as peak_date,
          NOW() as created_at
        FROM daily_energy
        WHERE YEAR(date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND MONTH(date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        GROUP BY YEAR(date), MONTH(date)
        ON DUPLICATE KEY UPDATE
          total_energy = VALUES(total_energy),
          avg_daily_energy = VALUES(avg_daily_energy),
          peak_date = VALUES(peak_date)
      `;

      await this.dataSource.query(query);
      this.logger.log('✅ Monthly aggregation completed');
    } catch (error) {
      this.logger.error('❌ Error in monthly aggregation:', error.message);
    }
  }

  // ================= MANUAL TRIGGERS =================
  
  async runAllAggregations() {
    this.logger.log('🔄 Running all aggregations manually...');
    await this.aggregateDaily();
    await this.aggregateWeekly();
    await this.aggregateMonthly();
    this.logger.log('✅ All aggregations completed');
  }
}