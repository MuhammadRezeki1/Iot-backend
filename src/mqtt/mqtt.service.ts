import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { PowerService } from '../power/power.service';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;

  constructor(private readonly powerService: PowerService) {
    console.log('🔥 MQTT Service constructed');
  }

  onModuleInit() {
    console.log('🚀 MQTT onModuleInit');
    this.client = mqtt.connect('mqtt://127.0.0.1:1883');

    this.client.on('connect', () => {
      console.log('✅ MQTT Connected');
      this.client.subscribe('iot/power', (err) => {
        if (!err) console.log('📡 Subscribed to topic iot/power');
      });
    });

    this.client.on('message', async (topic, message) => {
      console.log('📩 MQTT Message:', message.toString());
      try {
        const payload = JSON.parse(message.toString());
        const saved = await this.powerService.save(payload);
        console.log('📥 Data saved:', saved);
      } catch (err) {
        console.error('❌ MQTT Error:', err.message);
      }
    });
  }
}
