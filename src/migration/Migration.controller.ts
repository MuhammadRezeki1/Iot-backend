// import { Controller, Post, Get, Delete, HttpException, HttpStatus, Logger } from '@nestjs/common';
// import { MigrationService } from './Migration.service';

// @Controller('migration')
// export class MigrationController {
//   private readonly logger = new Logger(MigrationController.name);

//   constructor(private readonly migrationService: MigrationService) {}

//   /**
//    * 🚀 POST /migration/run
//    * Jalankan semua migrasi sekaligus
//    */
//   @Post('run')
//   async runFullMigration() {
//     try {
//       this.logger.log('🚀 Migration triggered via API');
//       const result = await this.migrationService.runFullMigration();
      
//       return {
//         success: true,
//         message: 'Migration completed successfully',
//         timestamp: new Date().toISOString(),
//         result: result,
//       };
//     } catch (error) {
//       this.logger.error('Migration failed:', error);
//       throw new HttpException(
//         {
//           success: false,
//           message: 'Migration failed',
//           error: error.message,
//         },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   /**
//    * 📊 POST /migration/hourly
//    * Migrate power_logs -> hourly_energy saja
//    */
//   @Post('hourly')
//   async migrateHourly() {
//     try {
//       this.logger.log('Running hourly migration only');
//       await this.migrationService.migratePowerLogsToHourly();
      
//       return {
//         success: true,
//         message: 'Hourly migration completed',
//         timestamp: new Date().toISOString(),
//       };
//     } catch (error) {
//       throw new HttpException(
//         'Hourly migration failed: ' + error.message,
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   /**
//    * 📅 POST /migration/daily
//    * Migrate hourly_energy -> daily_energy saja
//    */
//   @Post('daily')
//   async migrateDaily() {
//     try {
//       this.logger.log('Running daily migration only');
//       await this.migrationService.migrateHourlyToDaily();
      
//       return {
//         success: true,
//         message: 'Daily migration completed',
//         timestamp: new Date().toISOString(),
//       };
//     } catch (error) {
//       throw new HttpException(
//         'Daily migration failed: ' + error.message,
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   /**
//    * 📆 POST /migration/weekly
//    * Migrate daily_energy -> weekly_energy saja
//    */
//   @Post('weekly')
//   async migrateWeekly() {
//     try {
//       this.logger.log('Running weekly migration only');
//       await this.migrationService.migrateDailyToWeekly();
      
//       return {
//         success: true,
//         message: 'Weekly migration completed',
//         timestamp: new Date().toISOString(),
//       };
//     } catch (error) {
//       throw new HttpException(
//         'Weekly migration failed: ' + error.message,
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   /**
//    * 📊 POST /migration/monthly
//    * Migrate daily_energy -> monthly_energy saja
//    */
//   @Post('monthly')
//   async migrateMonthly() {
//     try {
//       this.logger.log('Running monthly migration only');
//       await this.migrationService.migrateDailyToMonthly();
      
//       return {
//         success: true,
//         message: 'Monthly migration completed',
//         timestamp: new Date().toISOString(),
//       };
//     } catch (error) {
//       throw new HttpException(
//         'Monthly migration failed: ' + error.message,
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   /**
//    * 🔍 GET /migration/status
//    * Cek berapa banyak data di setiap tabel
//    */
//   @Get('status')
//   async getMigrationStatus() {
//     try {
//       const status = await this.migrationService.getMigrationStatus();
      
//       return {
//         success: true,
//         data: status,
//         timestamp: new Date().toISOString(),
//       };
//     } catch (error) {
//       throw new HttpException(
//         'Failed to get migration status',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   /**
//    * 🗑️ DELETE /migration/clear
//    * Hapus semua data di tabel aggregasi (HATI-HATI!)
//    */
//   @Delete('clear')
//   async clearAggregationTables() {
//     try {
//       this.logger.warn('⚠️  Clearing all aggregation tables via API');
//       const result = await this.migrationService.clearAllAggregationTables();
      
//       return {
//         success: true,
//         message: 'All aggregation tables cleared',
//         timestamp: new Date().toISOString(),
//         result: result,
//       };
//     } catch (error) {
//       throw new HttpException(
//         'Failed to clear tables: ' + error.message,
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
// }