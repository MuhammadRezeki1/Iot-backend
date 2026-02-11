import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerController } from './power.controller';
import { PowerService } from './power.service';
import { PowerLog } from './power.entity';
import { DailyEnergy } from './Dailyenergy.entity';
import { WeeklyEnergy } from './Weeklyenergy.entity';
import { MonthlyEnergy } from './Monthlyenergy.entity';
import { HourlyEnergy } from './hourly-energy.entity';
import { MqttModule } from '../mqtt/mqtt.module';
import { AggregationModule } from '../aggregation/aggregation.module';
import { AlertService } from './alert.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PowerLog,
      DailyEnergy,
      WeeklyEnergy,
      MonthlyEnergy,
      HourlyEnergy,
    ]),
    forwardRef(() => MqttModule),
    AggregationModule,
  ],
  controllers: [PowerController],
  providers: [PowerService, AlertService],
  exports: [PowerService, AlertService],
})
export class PowerModule {}