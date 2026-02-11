import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DailyEnergy } from '../power/Dailyenergy.entity';
import { WeeklyEnergy } from '../power/Weeklyenergy.entity';
import { MonthlyEnergy } from '../power/Monthlyenergy.entity';

// ✅ Interface untuk weekly data
interface WeeklyDataInput {
  year: number;
  week: number;
  total_energy: number;
  avg_daily_energy: number;
  peak_date: string;
  pattern?: string; // Optional, hanya untuk realistic data
}

// ✅ Interface untuk monthly data
interface MonthlyDataInput {
  month: number;
  year: number;
  total_energy: number;
  avg_daily_energy: number;
  peak_date: string;
}

// ✅ Interface untuk daily data
interface DailyDataInput {
  date: string;
  total_energy: number;
  avg_energy: number;
  max_energy: number;
  min_energy: number;
  day_name: string;
}

@Injectable()
export class DataInjectionService {
  private readonly logger = new Logger(DataInjectionService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Aggregate hourly_energy data ke daily_energy
   * Mengambil data dari hourly_energy dan mengelompokkan per hari
   */
  async injectDailyData(): Promise<void> {
    try {
      this.logger.log('🚀 Starting daily data injection from hourly_energy...');

      // Query untuk aggregate data per hari dari hourly_energy
      const query = `
        INSERT INTO daily_energy (date, total_energy, avg_energy, max_energy, min_energy, created_at)
        SELECT 
          DATE(timestamp) as date,
          ROUND(SUM(COALESCE(energy, 0)), 2) as total_energy,
          ROUND(AVG(COALESCE(energy, 0)), 2) as avg_energy,
          ROUND(MAX(COALESCE(energy, 0)), 2) as max_energy,
          ROUND(MIN(COALESCE(energy, 0)), 2) as min_energy,
          NOW() as created_at
        FROM hourly_energy
        WHERE DATE(timestamp) NOT IN (SELECT date FROM daily_energy)
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp) ASC
      `;

      const result = await this.dataSource.query(query);
      
      this.logger.log(`✅ Successfully injected ${result.affectedRows || result.length} daily records`);
      
      // Tampilkan sample data yang baru diinsert
      const sample = await this.dataSource.query(`
        SELECT * FROM daily_energy 
        ORDER BY date DESC 
        LIMIT 5
      `);
      
      this.logger.log('📊 Sample injected data:');
      sample.forEach((row: any) => {
        this.logger.log(
          `   Date: ${row.date} | Total: ${row.total_energy}kWh | ` +
          `Avg: ${row.avg_energy}kWh | Max: ${row.max_energy}kWh`
        );
      });

    } catch (error) {
      this.logger.error('❌ Error injecting daily data:', error.message);
      throw error;
    }
  }

  /**
   * Inject data untuk tanggal tertentu
   */
  async injectSpecificDate(date: string): Promise<void> {
    try {
      this.logger.log(`🚀 Injecting data for date: ${date}`);

      const query = `
        INSERT INTO daily_energy (date, total_energy, avg_energy, max_energy, min_energy, created_at)
        SELECT 
          DATE(timestamp) as date,
          ROUND(SUM(COALESCE(energy, 0)), 2) as total_energy,
          ROUND(AVG(COALESCE(energy, 0)), 2) as avg_energy,
          ROUND(MAX(COALESCE(energy, 0)), 2) as max_energy,
          ROUND(MIN(COALESCE(energy, 0)), 2) as min_energy,
          NOW() as created_at
        FROM hourly_energy
        WHERE DATE(timestamp) = ?
        GROUP BY DATE(timestamp)
        ON CONFLICT (date) DO UPDATE SET
          total_energy = EXCLUDED.total_energy,
          avg_energy = EXCLUDED.avg_energy,
          max_energy = EXCLUDED.max_energy,
          min_energy = EXCLUDED.min_energy
      `;

      await this.dataSource.query(query, [date]);
      this.logger.log(`✅ Data injected for ${date}`);

    } catch (error) {
      this.logger.error(`❌ Error injecting data for ${date}:`, error.message);
      throw error;
    }
  }

  /**
   * Clear semua data di daily_energy (untuk testing)
   */
  async clearDailyData(): Promise<void> {
    try {
      await this.dataSource.query('DELETE FROM daily_energy');
      this.logger.log('🗑️  All daily_energy data cleared');
    } catch (error) {
      this.logger.error('❌ Error clearing daily data:', error.message);
      throw error;
    }
  }

  // ==================== 60 DAYS REALISTIC DATA ====================

  /**
   * Generate 60 hari data realistis dengan pola konsumsi harian
   * Data akan konsisten dengan weekly data yang ada
   */
  async inject60DaysData(): Promise<any> {
    try {
      this.logger.log('🚀 Starting 60 days realistic data injection...');

      const now = new Date();
      const dailyDataList: DailyDataInput[] = []; // ✅ Tambahkan tipe data

      // Pola konsumsi per hari dalam seminggu (0=Minggu, 6=Sabtu)
      const dayOfWeekPatterns = {
        0: { name: 'Sunday', multiplier: 1.15 },      // Weekend - tinggi
        1: { name: 'Monday', multiplier: 0.95 },      // Awal minggu - rendah
        2: { name: 'Tuesday', multiplier: 1.0 },      // Normal
        3: { name: 'Wednesday', multiplier: 1.05 },   // Mid-week - sedikit tinggi
        4: { name: 'Thursday', multiplier: 1.08 },    // Menjelang weekend
        5: { name: 'Friday', multiplier: 1.12 },      // Akhir minggu kerja
        6: { name: 'Saturday', multiplier: 1.18 },    // Weekend - paling tinggi
      };

      // Generate data untuk 60 hari terakhir
      for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
        const currentDate = new Date(now);
        currentDate.setDate(now.getDate() - dayOffset);
        currentDate.setHours(0, 0, 0, 0);

        const dayOfWeek = currentDate.getDay();
        const dayPattern = dayOfWeekPatterns[dayOfWeek];

        // Base energy per hari (rata-rata 25 kWh/hari)
        const baseEnergy = 25;
        
        // Variance berdasarkan minggu dalam bulan
        const weekOfMonth = Math.floor(currentDate.getDate() / 7) + 1;
        let weekMultiplier = 1.0;
        
        switch (weekOfMonth) {
          case 1: weekMultiplier = 1.10; break; // Minggu 1 - tinggi
          case 2: weekMultiplier = 1.05; break; // Minggu 2 - normal+
          case 3: weekMultiplier = 1.00; break; // Minggu 3 - normal
          case 4: weekMultiplier = 0.95; break; // Minggu 4 - rendah
        }

        // Random variance ±10%
        const randomVariance = (Math.random() * 0.2 - 0.1) + 1; // 0.9 - 1.1

        // Total energy calculation
        const totalEnergy = parseFloat(
          (baseEnergy * dayPattern.multiplier * weekMultiplier * randomVariance).toFixed(2)
        );

        // Simulate hourly data untuk avg, max, min
        const hourlyValues: number[] = []; // ✅ Tambahkan tipe data
        for (let hour = 0; hour < 24; hour++) {
          // Pola konsumsi per jam
          let hourMultiplier = 1.0;
          if (hour >= 0 && hour < 6) hourMultiplier = 0.3;      // Malam - rendah
          else if (hour >= 6 && hour < 9) hourMultiplier = 1.2; // Pagi - tinggi
          else if (hour >= 9 && hour < 17) hourMultiplier = 0.8; // Siang - sedang
          else if (hour >= 17 && hour < 22) hourMultiplier = 1.5; // Sore/malam - peak
          else hourMultiplier = 0.6; // Late night

          const hourlyEnergy = (totalEnergy / 24) * hourMultiplier;
          hourlyValues.push(hourlyEnergy);
        }

        const avgEnergy = parseFloat((hourlyValues.reduce((a, b) => a + b) / 24).toFixed(2));
        const maxEnergy = parseFloat(Math.max(...hourlyValues).toFixed(2));
        const minEnergy = parseFloat(Math.min(...hourlyValues).toFixed(2));

        dailyDataList.push({
          date: currentDate.toISOString().split('T')[0],
          total_energy: totalEnergy,
          avg_energy: avgEnergy,
          max_energy: maxEnergy,
          min_energy: minEnergy,
          day_name: dayPattern.name,
        });

        // Log setiap 10 hari untuk tidak spam
        if (dayOffset % 10 === 0 || dayOffset === 0) {
          this.logger.log(
            `   Day ${60 - dayOffset}/60 (${dayPattern.name}): ` +
            `${totalEnergy}kWh | Avg: ${avgEnergy}kWh`
          );
        }
      }

      this.logger.log(`Generated ${dailyDataList.length} daily records`);

      // Insert to database
      const repo = this.dataSource.getRepository(DailyEnergy);
      let inserted = 0;
      let updated = 0;

      for (const data of dailyDataList) {
        const existing = await repo.findOne({
          where: { date: new Date(data.date) }
        });

        if (existing) {
          await repo.update(
            { date: new Date(data.date) },
            {
              total_energy: data.total_energy,
              avg_energy: data.avg_energy,
              max_energy: data.max_energy,
              min_energy: data.min_energy,
            }
          );
          updated++;
        } else {
          await repo.save({
            date: new Date(data.date),
            total_energy: data.total_energy,
            avg_energy: data.avg_energy,
            max_energy: data.max_energy,
            min_energy: data.min_energy,
          });
          inserted++;
        }
      }

      this.logger.log(`✅ Inserted: ${inserted} | Updated: ${updated}`);

      // Calculate summary
      const totalEnergy = dailyDataList.reduce((sum, day) => sum + day.total_energy, 0);
      const avgDaily = totalEnergy / dailyDataList.length;

      this.logger.log(`📊 60 Days Summary:`);
      this.logger.log(`   Total Energy: ${totalEnergy.toFixed(2)} kWh`);
      this.logger.log(`   Average Daily: ${avgDaily.toFixed(2)} kWh`);
      this.logger.log(`   Date Range: ${dailyDataList[0].date} to ${dailyDataList[dailyDataList.length - 1].date}`);

      return {
        inserted,
        updated,
        total_records: dailyDataList.length,
        summary: {
          total_energy: parseFloat(totalEnergy.toFixed(2)),
          avg_daily_energy: parseFloat(avgDaily.toFixed(2)),
          date_start: dailyDataList[0].date,
          date_end: dailyDataList[dailyDataList.length - 1].date,
        },
        sample_data: dailyDataList.slice(0, 5), // First 5 days
      };

    } catch (error) {
      this.logger.error('❌ Error injecting 60 days data:', error.message);
      throw error;
    }
  }

  /**
   * Get all daily data
   */
  async getAllDailyData(): Promise<any[]> {
    try {
      const repo = this.dataSource.getRepository(DailyEnergy);
      const data = await repo.find({
        order: { date: 'DESC' },
      });

      return data.map(item => ({
        id: item.id,
        date: item.date,
        total_energy: parseFloat(item.total_energy.toString()),
        avg_energy: parseFloat(item.avg_energy.toString()),
        max_energy: parseFloat(item.max_energy.toString()),
        min_energy: parseFloat(item.min_energy.toString()),
        created_at: item.created_at,
      }));
    } catch (error) {
      this.logger.error('❌ Error getting daily data:', error.message);
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getInjectionStats(): Promise<any> {
    try {
      const hourlyCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM hourly_energy'
      );
      
      const dailyCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM daily_energy'
      );

      const weeklyCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM weekly_energy'
      );

      const monthlyCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM monthly_energy'
      );

      const dateRange = await this.dataSource.query(`
        SELECT 
          MIN(DATE(timestamp)) as first_date,
          MAX(DATE(timestamp)) as last_date
        FROM hourly_energy
      `);

      return {
        hourly_records: hourlyCount[0].count,
        daily_records: dailyCount[0].count,
        weekly_records: weeklyCount[0].count,
        monthly_records: monthlyCount[0].count,
        date_range: dateRange[0],
      };
    } catch (error) {
      this.logger.error('❌ Error getting stats:', error.message);
      throw error;
    }
  }

  // ==================== WEEKLY DUMMY DATA INJECTION ====================

  /**
   * Generate realistic dummy weekly data untuk 4 minggu terakhir
   * Data akan terlihat seperti data real dengan pola konsumsi yang wajar
   */
  async injectWeeklyDummyData(): Promise<any> {
    try {
      this.logger.log('🚀 Starting weekly dummy data injection (4 weeks)...');

      const now = new Date();
      const weeklyData: WeeklyDataInput[] = []; // ✅ Tambahkan tipe data

      // Generate data untuk 4 minggu terakhir
      for (let weekOffset = 3; weekOffset >= 0; weekOffset--) {
        const weekDate = new Date(now);
        weekDate.setDate(now.getDate() - (weekOffset * 7));

        const year = weekDate.getFullYear();
        const weekNumber = this.getWeekNumber(weekDate);

        // Generate realistic energy consumption
        // Minggu biasanya konsumsi lebih tinggi karena lebih banyak aktivitas
        const baseEnergy = 180; // kWh per minggu (base)
        const variance = Math.random() * 40 - 20; // ±20 kWh variance
        const totalEnergy = parseFloat((baseEnergy + variance).toFixed(2));

        // Average per hari = total / 7
        const avgDailyEnergy = parseFloat((totalEnergy / 7).toFixed(2));

        // Peak date biasanya di hari tengah minggu (rabu-kamis) atau weekend
        const peakDayOffset = Math.floor(Math.random() * 7);
        const peakDate = new Date(weekDate);
        peakDate.setDate(weekDate.getDate() - weekDate.getDay() + peakDayOffset);

        weeklyData.push({
          year,
          week: weekNumber,
          total_energy: totalEnergy,
          avg_daily_energy: avgDailyEnergy,
          peak_date: peakDate.toISOString().split('T')[0],
        });

        this.logger.log(
          `   Week ${weekNumber}/${year}: ${totalEnergy}kWh | ` +
          `Avg: ${avgDailyEnergy}kWh/day | Peak: ${peakDate.toISOString().split('T')[0]}`
        );
      }

      // Insert data ke database
      const repo = this.dataSource.getRepository(WeeklyEnergy);
      
      for (const data of weeklyData) {
        // Check if already exists
        const existing = await repo.findOne({
          where: { year: data.year, week: data.week }
        });

        if (existing) {
          // Update existing
          await repo.update(
            { year: data.year, week: data.week },
            {
              total_energy: data.total_energy,
              avg_daily_energy: data.avg_daily_energy,
              peak_date: new Date(data.peak_date),
            }
          );
        } else {
          // Insert new
          await repo.save({
            year: data.year,
            week: data.week,
            total_energy: data.total_energy,
            avg_daily_energy: data.avg_daily_energy,
            peak_date: new Date(data.peak_date),
          });
        }
      }

      this.logger.log(`✅ Successfully injected ${weeklyData.length} weekly records`);

      // Verify insertion
      const allWeekly = await repo.find({
        order: { year: 'DESC', week: 'DESC' },
        take: 4,
      });

      return {
        inserted: weeklyData.length,
        data: allWeekly,
      };

    } catch (error) {
      this.logger.error('❌ Error injecting weekly dummy data:', error.message);
      throw error;
    }
  }

  /**
   * Generate realistic dummy data untuk 1 bulan penuh (4 minggu)
   * Dengan pola konsumsi yang lebih detail dan realistis
   */
  async injectWeeklyRealisticData(): Promise<any> {
    try {
      this.logger.log('🚀 Starting realistic weekly data injection (4 weeks with patterns)...');

      const now = new Date();
      const weeklyData: WeeklyDataInput[] = []; // ✅ Tambahkan tipe data

      // Pola konsumsi berbeda per minggu
      const weekPatterns = [
        { name: 'Week 1 - High Usage', multiplier: 1.15 }, // Minggu awal bulan, aktivitas tinggi
        { name: 'Week 2 - Normal', multiplier: 1.0 },     // Minggu normal
        { name: 'Week 3 - Above Average', multiplier: 1.08 }, // Sedikit tinggi
        { name: 'Week 4 - Low Usage', multiplier: 0.92 },  // Akhir bulan, hemat listrik
      ];

      for (let weekOffset = 3; weekOffset >= 0; weekOffset--) {
        const weekDate = new Date(now);
        weekDate.setDate(now.getDate() - (weekOffset * 7));

        const year = weekDate.getFullYear();
        const weekNumber = this.getWeekNumber(weekDate);
        const pattern = weekPatterns[3 - weekOffset];

        // Base consumption dengan pola
        const baseEnergy = 175; // kWh base
        const seasonalVariance = Math.random() * 30 - 15; // Variance musiman
        const totalEnergy = parseFloat(
          ((baseEnergy + seasonalVariance) * pattern.multiplier).toFixed(2)
        );

        const avgDailyEnergy = parseFloat((totalEnergy / 7).toFixed(2));

        // Peak date: Weekend (Sabtu/Minggu) atau mid-week (Rabu)
        const peakDayOptions = [0, 3, 6]; // Minggu, Rabu, Sabtu
        const peakDayOffset = peakDayOptions[Math.floor(Math.random() * peakDayOptions.length)];
        const peakDate = new Date(weekDate);
        peakDate.setDate(weekDate.getDate() - weekDate.getDay() + peakDayOffset);

        weeklyData.push({
          year,
          week: weekNumber,
          total_energy: totalEnergy,
          avg_daily_energy: avgDailyEnergy,
          peak_date: peakDate.toISOString().split('T')[0],
          pattern: pattern.name,
        });

        this.logger.log(
          `   ${pattern.name} (Week ${weekNumber}/${year}): ` +
          `${totalEnergy}kWh | Avg: ${avgDailyEnergy}kWh/day | ` +
          `Peak: ${peakDate.toISOString().split('T')[0]}`
        );
      }

      // Insert to database
      const repo = this.dataSource.getRepository(WeeklyEnergy);
      
      for (const data of weeklyData) {
        const existing = await repo.findOne({
          where: { year: data.year, week: data.week }
        });

        if (existing) {
          await repo.update(
            { year: data.year, week: data.week },
            {
              total_energy: data.total_energy,
              avg_daily_energy: data.avg_daily_energy,
              peak_date: new Date(data.peak_date),
            }
          );
        } else {
          await repo.save({
            year: data.year,
            week: data.week,
            total_energy: data.total_energy,
            avg_daily_energy: data.avg_daily_energy,
            peak_date: new Date(data.peak_date),
          });
        }
      }

      this.logger.log(`✅ Successfully injected ${weeklyData.length} realistic weekly records`);

      // Calculate monthly total
      const monthlyTotal = weeklyData.reduce((sum, week) => sum + week.total_energy, 0);
      const monthlyAvg = monthlyTotal / weeklyData.length;

      this.logger.log(`📊 Monthly Summary:`);
      this.logger.log(`   Total Monthly Energy: ${monthlyTotal.toFixed(2)} kWh`);
      this.logger.log(`   Average Weekly Energy: ${monthlyAvg.toFixed(2)} kWh`);
      this.logger.log(`   Average Daily Energy: ${(monthlyTotal / 28).toFixed(2)} kWh`);

      return {
        inserted: weeklyData.length,
        monthly_summary: {
          total_energy: parseFloat(monthlyTotal.toFixed(2)),
          avg_weekly: parseFloat(monthlyAvg.toFixed(2)),
          avg_daily: parseFloat((monthlyTotal / 28).toFixed(2)),
        },
        data: weeklyData,
      };

    } catch (error) {
      this.logger.error('❌ Error injecting realistic weekly data:', error.message);
      throw error;
    }
  }

  /**
   * Clear weekly data
   */
  async clearWeeklyData(): Promise<void> {
    try {
      await this.dataSource.query('DELETE FROM weekly_energy');
      this.logger.log('🗑️  All weekly_energy data cleared');
    } catch (error) {
      this.logger.error('❌ Error clearing weekly data:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Get all weekly data
   */
  async getAllWeeklyData(): Promise<any[]> {
    try {
      const repo = this.dataSource.getRepository(WeeklyEnergy);
      const data = await repo.find({
        order: { year: 'DESC', week: 'DESC' },
      });

      return data.map(item => ({
        id: item.id,
        year: item.year,
        week: item.week,
        total_energy: parseFloat(item.total_energy.toString()),
        avg_daily_energy: parseFloat(item.avg_daily_energy.toString()),
        peak_date: item.peak_date,
        created_at: item.created_at,
      }));
    } catch (error) {
      this.logger.error('❌ Error getting weekly data:', error.message);
      return [];
    }
  }

  // ==================== 8 WEEKS DATA (2 MONTHS) ====================

  /**
   * Generate 8 minggu data (2 bulan penuh) dengan pola realistis
   */
  async injectWeekly8Weeks(): Promise<any> {
    try {
      this.logger.log('🚀 Starting 8 weeks data injection (2 months)...');

      const now = new Date();
      const weeklyData: WeeklyDataInput[] = [];

      // Pola untuk 8 minggu (2 bulan)
      const weekPatterns = [
        // Bulan pertama
        { name: 'Month 1 - Week 1: High Usage', multiplier: 1.15 },
        { name: 'Month 1 - Week 2: Normal', multiplier: 1.0 },
        { name: 'Month 1 - Week 3: Above Average', multiplier: 1.08 },
        { name: 'Month 1 - Week 4: Low Usage', multiplier: 0.92 },
        // Bulan kedua
        { name: 'Month 2 - Week 1: Very High', multiplier: 1.20 },
        { name: 'Month 2 - Week 2: High', multiplier: 1.12 },
        { name: 'Month 2 - Week 3: Normal', multiplier: 1.05 },
        { name: 'Month 2 - Week 4: Average', multiplier: 0.98 },
      ];

      // Generate data untuk 8 minggu terakhir
      for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
        const weekDate = new Date(now);
        weekDate.setDate(now.getDate() - (weekOffset * 7));

        const year = weekDate.getFullYear();
        const weekNumber = this.getWeekNumber(weekDate);
        const pattern = weekPatterns[7 - weekOffset];

        // Base consumption dengan pola berbeda tiap minggu
        const baseEnergy = 175;
        const seasonalVariance = Math.random() * 25 - 12.5;
        const totalEnergy = parseFloat(
          ((baseEnergy + seasonalVariance) * pattern.multiplier).toFixed(2)
        );

        const avgDailyEnergy = parseFloat((totalEnergy / 7).toFixed(2));

        // Peak date: Random antara weekend atau mid-week
        const peakDayOptions = [0, 3, 6];
        const peakDayOffset = peakDayOptions[Math.floor(Math.random() * peakDayOptions.length)];
        const peakDate = new Date(weekDate);
        peakDate.setDate(weekDate.getDate() - weekDate.getDay() + peakDayOffset);

        weeklyData.push({
          year,
          week: weekNumber,
          total_energy: totalEnergy,
          avg_daily_energy: avgDailyEnergy,
          peak_date: peakDate.toISOString().split('T')[0],
          pattern: pattern.name,
        });

        this.logger.log(
          `   ${pattern.name} (W${weekNumber}/${year}): ` +
          `${totalEnergy}kWh | Avg: ${avgDailyEnergy}kWh/day | ` +
          `Peak: ${peakDate.toISOString().split('T')[0]}`
        );
      }

      // Insert to database
      const repo = this.dataSource.getRepository(WeeklyEnergy);
      
      for (const data of weeklyData) {
        const existing = await repo.findOne({
          where: { year: data.year, week: data.week }
        });

        if (existing) {
          await repo.update(
            { year: data.year, week: data.week },
            {
              total_energy: data.total_energy,
              avg_daily_energy: data.avg_daily_energy,
              peak_date: new Date(data.peak_date),
            }
          );
        } else {
          await repo.save({
            year: data.year,
            week: data.week,
            total_energy: data.total_energy,
            avg_daily_energy: data.avg_daily_energy,
            peak_date: new Date(data.peak_date),
          });
        }
      }

      this.logger.log(`✅ Successfully injected ${weeklyData.length} weekly records`);

      // Group by month untuk summary
      const monthlyGroups = this.groupWeeksByMonth(weeklyData);
      
      this.logger.log(`📊 Summary per Month:`);
      monthlyGroups.forEach((monthData: any) => {
        this.logger.log(
          `   ${monthData.month}/${monthData.year}: ` +
          `${monthData.total}kWh (${monthData.weeks.length} weeks)`
        );
      });

      return {
        inserted: weeklyData.length,
        data: weeklyData,
        monthly_summary: monthlyGroups,
      };

    } catch (error) {
      this.logger.error('❌ Error injecting 8 weeks data:', error.message);
      throw error;
    }
  }

  // ==================== MONTHLY DATA INJECTION ====================

  /**
   * Aggregate weekly data ke monthly
   * Ambil semua data weekly, group by month, lalu insert ke monthly_energy
   */
  async injectMonthlyFromWeekly(): Promise<any> {
    try {
      this.logger.log('🚀 Starting monthly data aggregation from weekly_energy...');

      // Get all weekly data
      const weeklyData = await this.dataSource.query(`
        SELECT 
          year,
          week,
          total_energy,
          avg_daily_energy,
          peak_date
        FROM weekly_energy
        ORDER BY year ASC, week ASC
      `);

      if (weeklyData.length === 0) {
        this.logger.warn('⚠️  No weekly data found. Please inject weekly data first.');
        return { inserted: 0, data: [] };
      }

      this.logger.log(`Found ${weeklyData.length} weekly records to process`);

      // Group by month
      const monthlyMap = new Map<string, any>();

      weeklyData.forEach((week: any) => {
        // Get month from week number
        const weekDate = this.getDateFromWeek(week.year, week.week);
        const month = weekDate.getMonth() + 1;
        const year = weekDate.getFullYear();
        const key = `${year}-${month}`;

        if (!monthlyMap.has(key)) {
          monthlyMap.set(key, {
            month,
            year,
            weeks: [],
            total_energy: 0,
            peak_date: week.peak_date,
          });
        }

        const monthData = monthlyMap.get(key);
        monthData.weeks.push(week);
        monthData.total_energy += parseFloat(week.total_energy);
        
        // Update peak_date jika ada yang lebih baru
        if (new Date(week.peak_date) > new Date(monthData.peak_date)) {
          monthData.peak_date = week.peak_date;
        }
      });

      // Calculate averages and insert
      const repo = this.dataSource.getRepository(MonthlyEnergy);
      const monthlyResults: MonthlyDataInput[] = [];

      for (const [key, monthData] of monthlyMap) {
        const weekCount = monthData.weeks.length;
        const totalEnergy = parseFloat(monthData.total_energy.toFixed(2));
        const avgDailyEnergy = parseFloat((totalEnergy / (weekCount * 7)).toFixed(2));

        const monthlyInput: MonthlyDataInput = {
          month: monthData.month,
          year: monthData.year,
          total_energy: totalEnergy,
          avg_daily_energy: avgDailyEnergy,
          peak_date: monthData.peak_date,
        };

        // Check if exists
        const existing = await repo.findOne({
          where: { year: monthData.year, month: monthData.month }
        });

        if (existing) {
          await repo.update(
            { year: monthData.year, month: monthData.month },
            {
              total_energy: totalEnergy,
              avg_daily_energy: avgDailyEnergy,
              peak_date: new Date(monthData.peak_date),
            }
          );
        } else {
          await repo.save({
            month: monthData.month,
            year: monthData.year,
            total_energy: totalEnergy,
            avg_daily_energy: avgDailyEnergy,
            peak_date: new Date(monthData.peak_date),
          });
        }

        monthlyResults.push(monthlyInput);

        this.logger.log(
          `   ${monthData.month}/${monthData.year}: ` +
          `${totalEnergy}kWh | Avg Daily: ${avgDailyEnergy}kWh | ` +
          `${weekCount} weeks`
        );
      }

      this.logger.log(`✅ Successfully aggregated ${monthlyResults.length} monthly records`);

      return {
        inserted: monthlyResults.length,
        data: monthlyResults,
      };

    } catch (error) {
      this.logger.error('❌ Error aggregating monthly data:', error.message);
      throw error;
    }
  }

  /**
   * Clear monthly data
   */
  async clearMonthlyData(): Promise<void> {
    try {
      await this.dataSource.query('DELETE FROM monthly_energy');
      this.logger.log('🗑️  All monthly_energy data cleared');
    } catch (error) {
      this.logger.error('❌ Error clearing monthly data:', error.message);
      throw error;
    }
  }

  /**
   * Get all monthly data
   */
  async getAllMonthlyData(): Promise<any[]> {
    try {
      const repo = this.dataSource.getRepository(MonthlyEnergy);
      const data = await repo.find({
        order: { year: 'DESC', month: 'DESC' },
      });

      return data.map(item => ({
        id: item.id,
        month: item.month,
        year: item.year,
        total_energy: parseFloat(item.total_energy.toString()),
        avg_daily_energy: parseFloat(item.avg_daily_energy.toString()),
        peak_date: item.peak_date,
        created_at: item.created_at,
      }));
    } catch (error) {
      this.logger.error('❌ Error getting monthly data:', error.message);
      return [];
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Group weekly data by month
   */
  private groupWeeksByMonth(weeklyData: WeeklyDataInput[]): any[] {
    const monthlyMap = new Map<string, any>();

    weeklyData.forEach(week => {
      const weekDate = this.getDateFromWeek(week.year, week.week);
      const month = weekDate.getMonth() + 1;
      const year = weekDate.getFullYear();
      const key = `${year}-${month}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month,
          year,
          weeks: [],
          total: 0,
        });
      }

      const monthData = monthlyMap.get(key);
      monthData.weeks.push(week);
      monthData.total += week.total_energy;
    });

    return Array.from(monthlyMap.values()).map(m => ({
      ...m,
      total: parseFloat(m.total.toFixed(2)),
    }));
  }

  /**
   * Get date from ISO week number
   */
  private getDateFromWeek(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return ISOweekStart;
  }
}