import { Module, forwardRef } from '@nestjs/common'; // 🔥 Import forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerController } from './power.controller';
import { PowerService } from './power.service';
import { PowerLog } from './power.entity';
import { DailyEnergy } from './Dailyenergy.entity';
import { WeeklyEnergy } from './Weeklyenergy.entity';
import { MonthlyEnergy } from './Monthlyenergy.entity';
import { HourlyEnergy } from './hourly-energy.entity';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PowerLog,
      DailyEnergy,
      WeeklyEnergy,
      MonthlyEnergy,
      HourlyEnergy,
    ]),
    forwardRef(() => MqttModule), // 🔥 Gunakan forwardRef untuk menghindari circular dependency
  ],
  controllers: [PowerController],
  providers: [PowerService],
  exports: [PowerService],
})
export class PowerModule {}