// import { Injectable, Logger } from '@nestjs/common';
// import { DataSource } from 'typeorm';
// import { HourlyEnergy } from '../power/hourly-energy.entity';
// import { DailyEnergy } from '../power/Dailyenergy.entity';
// import { WeeklyEnergy } from '../power/Weeklyenergy.entity';
// import { MonthlyEnergy } from '../power/Monthlyenergy.entity';

// @Injectable()
// export class MigrationService {
//   private readonly logger = new Logger(MigrationService.name);

//   constructor(private readonly dataSource: DataSource) {}

//   /**
//    * 🚀 MAIN MIGRATION - Jalankan semua migrasi sekaligus
//    */
//   async runFullMigration() {
//     this.logger.log('🚀 ========================================');
//     this.logger.log('🚀 STARTING FULL DATA MIGRATION');
//     this.logger.log('🚀 ========================================');

//     try {
//       // Step 1: Migrate power_logs -> hourly_energy
//       await this.migratePowerLogsToHourly();

//       // Step 2: Migrate hourly_energy -> daily_energy
//       await this.migrateHourlyToDaily();

//       // Step 3: Migrate daily_energy -> weekly_energy
//       await this.migrateDailyToWeekly();

//       // Step 4: Migrate daily_energy -> monthly_energy
//       await this.migrateDailyToMonthly();

//       this.logger.log('✅ ========================================');
//       this.logger.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
//       this.logger.log('✅ ========================================');

//       return {
//         success: true,
//         message: 'All migrations completed successfully',
//       };
//     } catch (error) {
//       this.logger.error('❌ Migration failed:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * 📊 STEP 1: Migrate power_logs -> hourly_energy
//    * Grouping data per jam dari power_logs
//    */
//   async migratePowerLogsToHourly() {
//     this.logger.log('');
//     this.logger.log('📊 [STEP 1] Migrating power_logs -> hourly_energy');
//     this.logger.log('─────────────────────────────────────────');

//     try {
//       // Get hourly aggregated data from power_logs
//       const query = `
//         SELECT 
//           DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour_timestamp,
//           AVG(energi_kwh) as avg_energy,
//           AVG(tegangan) as avg_voltage,
//           AVG(arus) as avg_current,
//           AVG(pf) as avg_power_factor,
//           COUNT(*) as record_count
//         FROM power_logs
//         GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')
//         ORDER BY hour_timestamp ASC
//       `;

//       const hourlyData = await this.dataSource.query(query);
//       this.logger.log(`   Found ${hourlyData.length} hours to migrate`);

//       const hourlyRepo = this.dataSource.getRepository(HourlyEnergy);
//       let insertedCount = 0;
//       let skippedCount = 0;

//       for (const row of hourlyData) {
//         const timestamp = new Date(row.hour_timestamp);

//         // Check if already exists
//         const exists = await hourlyRepo.findOne({ where: { timestamp } });

//         if (!exists) {
//           const hourlyRecord = hourlyRepo.create({
//             timestamp: timestamp,
//             energy: parseFloat(Number(row.avg_energy || 0).toFixed(4)),
//             voltage: parseFloat(Number(row.avg_voltage || 220).toFixed(2)),
//             current: parseFloat(Number(row.avg_current || 0).toFixed(2)),
//             power_factor: parseFloat(Number(row.avg_power_factor || 0.95).toFixed(2)),
//           });

//           await hourlyRepo.save(hourlyRecord);
//           insertedCount++;
//         } else {
//           skippedCount++;
//         }
//       }

//       this.logger.log(`   ✅ Inserted: ${insertedCount} records`);
//       this.logger.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
//       this.logger.log('');

//     } catch (error) {
//       this.logger.error('   ❌ Error in hourly migration:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * 📅 STEP 2: Migrate hourly_energy -> daily_energy
//    * Grouping data per hari dari hourly_energy
//    */
//   async migrateHourlyToDaily() {
//     this.logger.log('📅 [STEP 2] Migrating hourly_energy -> daily_energy');
//     this.logger.log('─────────────────────────────────────────');

//     try {
//       // Get daily aggregated data from hourly_energy
//       const query = `
//         SELECT 
//           DATE(timestamp) as day_date,
//           SUM(energy) as total_energy,
//           AVG(energy) as avg_energy,
//           MAX(energy) as max_energy,
//           MIN(energy) as min_energy,
//           COUNT(*) as hour_count
//         FROM hourly_energy
//         GROUP BY DATE(timestamp)
//         ORDER BY day_date ASC
//       `;

//       const dailyData = await this.dataSource.query(query);
//       this.logger.log(`   Found ${dailyData.length} days to migrate`);

//       const dailyRepo = this.dataSource.getRepository(DailyEnergy);
//       let insertedCount = 0;
//       let skippedCount = 0;

//       for (const row of dailyData) {
//         const date = new Date(row.day_date);

//         // Check if already exists
//         const exists = await dailyRepo.findOne({ where: { date } });

//         if (!exists) {
//           const dailyRecord = dailyRepo.create({
//             date: date,
//             total_energy: parseFloat(Number(row.total_energy || 0).toFixed(2)),
//             avg_energy: parseFloat(Number(row.avg_energy || 0).toFixed(2)),
//             max_energy: parseFloat(Number(row.max_energy || 0).toFixed(2)),
//             min_energy: parseFloat(Number(row.min_energy || 0).toFixed(2)),
//           });

//           await dailyRepo.save(dailyRecord);
//           insertedCount++;
//         } else {
//           skippedCount++;
//         }
//       }

//       this.logger.log(`   ✅ Inserted: ${insertedCount} records`);
//       this.logger.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
//       this.logger.log('');

//     } catch (error) {
//       this.logger.error('   ❌ Error in daily migration:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * 📆 STEP 3: Migrate daily_energy -> weekly_energy
//    * Grouping data per minggu dari daily_energy
//    */
//   async migrateDailyToWeekly() {
//     this.logger.log('📆 [STEP 3] Migrating daily_energy -> weekly_energy');
//     this.logger.log('─────────────────────────────────────────');

//     try {
//       // Get weekly aggregated data from daily_energy
//       const query = `
//         SELECT 
//           YEAR(date) as year,
//           WEEK(date, 3) as week,
//           SUM(total_energy) as total_energy,
//           AVG(total_energy) as avg_daily_energy,
//           MAX(total_energy) as peak_energy,
//           (SELECT date FROM daily_energy d2 
//            WHERE YEAR(d2.date) = YEAR(d1.date) 
//            AND WEEK(d2.date, 3) = WEEK(d1.date, 3)
//            ORDER BY d2.total_energy DESC LIMIT 1) as peak_date,
//           COUNT(*) as day_count
//         FROM daily_energy d1
//         GROUP BY YEAR(date), WEEK(date, 3)
//         ORDER BY year ASC, week ASC
//       `;

//       const weeklyData = await this.dataSource.query(query);
//       this.logger.log(`   Found ${weeklyData.length} weeks to migrate`);

//       const weeklyRepo = this.dataSource.getRepository(WeeklyEnergy);
//       let insertedCount = 0;
//       let skippedCount = 0;

//       for (const row of weeklyData) {
//         // Check if already exists
//         const exists = await weeklyRepo.findOne({
//           where: { year: row.year, week: row.week },
//         });

//         if (!exists) {
//           const weeklyRecord: Partial<WeeklyEnergy> = {
//             year: row.year,
//             week: row.week,
//             total_energy: parseFloat(Number(row.total_energy || 0).toFixed(2)),
//             avg_daily_energy: parseFloat(Number(row.avg_daily_energy || 0).toFixed(2)),
//           };

//           // Only add peak_date if it exists
//           if (row.peak_date) {
//             weeklyRecord.peak_date = new Date(row.peak_date);
//           }

//           await weeklyRepo.save(weeklyRepo.create(weeklyRecord));
//           insertedCount++;
//         } else {
//           skippedCount++;
//         }
//       }

//       this.logger.log(`   ✅ Inserted: ${insertedCount} records`);
//       this.logger.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
//       this.logger.log('');

//     } catch (error) {
//       this.logger.error('   ❌ Error in weekly migration:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * 📊 STEP 4: Migrate daily_energy -> monthly_energy
//    * Grouping data per bulan dari daily_energy
//    */
//   async migrateDailyToMonthly() {
//     this.logger.log('📊 [STEP 4] Migrating daily_energy -> monthly_energy');
//     this.logger.log('─────────────────────────────────────────');

//     try {
//       // Get monthly aggregated data from daily_energy
//       const query = `
//         SELECT 
//           YEAR(date) as year,
//           MONTH(date) as month,
//           SUM(total_energy) as total_energy,
//           AVG(total_energy) as avg_daily_energy,
//           (SELECT date FROM daily_energy d2 
//            WHERE YEAR(d2.date) = YEAR(d1.date) 
//            AND MONTH(d2.date) = MONTH(d1.date)
//            ORDER BY d2.total_energy DESC LIMIT 1) as peak_date,
//           COUNT(*) as day_count
//         FROM daily_energy d1
//         GROUP BY YEAR(date), MONTH(date)
//         ORDER BY year ASC, month ASC
//       `;

//       const monthlyData = await this.dataSource.query(query);
//       this.logger.log(`   Found ${monthlyData.length} months to migrate`);

//       const monthlyRepo = this.dataSource.getRepository(MonthlyEnergy);
//       let insertedCount = 0;
//       let skippedCount = 0;

//       for (const row of monthlyData) {
//         // Check if already exists
//         const exists = await monthlyRepo.findOne({
//           where: { year: row.year, month: row.month },
//         });

//         if (!exists) {
//           const monthlyRecord: Partial<MonthlyEnergy> = {
//             year: row.year,
//             month: row.month,
//             total_energy: parseFloat(Number(row.total_energy || 0).toFixed(2)),
//             avg_daily_energy: parseFloat(Number(row.avg_daily_energy || 0).toFixed(2)),
//           };

//           // Only add peak_date if it exists
//           if (row.peak_date) {
//             monthlyRecord.peak_date = new Date(row.peak_date);
//           }

//           await monthlyRepo.save(monthlyRepo.create(monthlyRecord));
//           insertedCount++;
//         } else {
//           skippedCount++;
//         }
//       }

//       this.logger.log(`   ✅ Inserted: ${insertedCount} records`);
//       this.logger.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
//       this.logger.log('');

//     } catch (error) {
//       this.logger.error('   ❌ Error in monthly migration:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * 🔍 Get migration status
//    */
//   async getMigrationStatus() {
//     try {
//       const powerLogsCount = await this.dataSource.query(
//         'SELECT COUNT(*) as count FROM power_logs'
//       );
//       const hourlyCount = await this.dataSource.query(
//         'SELECT COUNT(*) as count FROM hourly_energy'
//       );
//       const dailyCount = await this.dataSource.query(
//         'SELECT COUNT(*) as count FROM daily_energy'
//       );
//       const weeklyCount = await this.dataSource.query(
//         'SELECT COUNT(*) as count FROM weekly_energy'
//       );
//       const monthlyCount = await this.dataSource.query(
//         'SELECT COUNT(*) as count FROM monthly_energy'
//       );

//       return {
//         power_logs: parseInt(powerLogsCount[0].count),
//         hourly_energy: parseInt(hourlyCount[0].count),
//         daily_energy: parseInt(dailyCount[0].count),
//         weekly_energy: parseInt(weeklyCount[0].count),
//         monthly_energy: parseInt(monthlyCount[0].count),
//       };
//     } catch (error) {
//       this.logger.error('Error getting migration status:', error.message);
//       return null;
//     }
//   }

//   /**
//    * 🗑️ Clear all aggregation tables (HATI-HATI!)
//    */
//   async clearAllAggregationTables() {
//     this.logger.warn('⚠️  CLEARING ALL AGGREGATION TABLES...');

//     try {
//       await this.dataSource.query('DELETE FROM monthly_energy');
//       await this.dataSource.query('DELETE FROM weekly_energy');
//       await this.dataSource.query('DELETE FROM daily_energy');
//       await this.dataSource.query('DELETE FROM hourly_energy');

//       this.logger.log('✅ All aggregation tables cleared');
//       return { success: true, message: 'All tables cleared' };
//     } catch (error) {
//       this.logger.error('❌ Error clearing tables:', error.message);
//       throw error;
//     }
//   }
// }