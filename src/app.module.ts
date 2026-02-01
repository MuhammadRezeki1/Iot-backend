import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerLog } from './power/power.entity';
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
      entities: [PowerLog],
      synchronize: true,
    }),
    PowerModule,
    MqttModule,
  ],
})
export class AppModule {}
