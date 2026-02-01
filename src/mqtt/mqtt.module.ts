import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { PowerModule } from '../power/power.module';

@Module({
  imports: [PowerModule],
  providers: [MqttService],
})
export class MqttModule {}
