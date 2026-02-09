import { Module, forwardRef } from '@nestjs/common'; // 🔥 Import forwardRef
import { MqttService } from './mqtt.service';
import { PowerModule } from '../power/power.module';

@Module({
  imports: [
    forwardRef(() => PowerModule), // 🔥 Gunakan forwardRef untuk menghindari circular dependency
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}