// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { MigrationService } from './Migration.service';
// import { MigrationController } from './Migration.controller';
// import { PowerLog } from '../power/power.entity';
// import { HourlyEnergy } from '../power/hourly-energy.entity';
// import { DailyEnergy } from '../power/Dailyenergy.entity';
// import { WeeklyEnergy } from '../power/Weeklyenergy.entity';
// import { MonthlyEnergy } from '../power/Monthlyenergy.entity';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([
//       PowerLog,
//       HourlyEnergy,
//       DailyEnergy,
//       WeeklyEnergy,
//       MonthlyEnergy,
//     ]),
//   ],
//   controllers: [MigrationController],
//   providers: [MigrationService],
//   exports: [MigrationService], // Export jika ingin digunakan di module lain
// })
// export class MigrationModule {}