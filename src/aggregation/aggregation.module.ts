import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AggregationService } from './aggregation.service';
import { DailyEnergy } from '../power/Dailyenergy.entity';
import { WeeklyEnergy } from '../power/Weeklyenergy.entity';
import { MonthlyEnergy } from '../power/Monthlyenergy.entity';
import { HourlyEnergy } from '../power/hourly-energy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HourlyEnergy,
      DailyEnergy,
      WeeklyEnergy,
      MonthlyEnergy,
    ]),
  ],
  providers: [AggregationService],
  exports: [AggregationService],
})
export class AggregationModule {}