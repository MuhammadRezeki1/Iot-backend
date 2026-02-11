import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataInjectionService } from './data-injection.service';
import { DataInjectionController } from './data-injection.controller';
import { DailyEnergy } from '../power/Dailyenergy.entity';
import { WeeklyEnergy } from '../power/Weeklyenergy.entity';
import { MonthlyEnergy } from '../power/Monthlyenergy.entity';
import { HourlyEnergy } from '../power/hourly-energy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyEnergy, 
      WeeklyEnergy,
      MonthlyEnergy, 
      HourlyEnergy
    ]),
  ],
  controllers: [DataInjectionController],
  providers: [DataInjectionService],
  exports: [DataInjectionService],
})
export class DataInjectionModule {}