import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerLog } from './power/power.entity';
import { DailyEnergy } from './power/Dailyenergy.entity';
import { WeeklyEnergy } from './power/Weeklyenergy.entity';
import { MonthlyEnergy } from './power/Monthlyenergy.entity';
import { HourlyEnergy } from './power/hourly-energy.entity';
import { PowerModule } from './power/power.module';
import { MqttModule } from './mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'iot_monitoring',
      entities: [PowerLog, DailyEnergy, WeeklyEnergy, MonthlyEnergy, HourlyEnergy],
      synchronize: true,
      logging: false, // Set true untuk debug SQL
    }),
    PowerModule,
    MqttModule,
  ],
})
export class AppModule {}