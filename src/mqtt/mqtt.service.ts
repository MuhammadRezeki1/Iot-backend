import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { PowerService } from '../power/power.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private readonly MQTT_BROKER = 'tcp://test.mosquitto.org:1883';
  
  // MQTT Topics
  private readonly TOPIC_POWER_DATA = 'iot/power';
  private readonly TOPIC_POWER_CONTROL = 'iot/power/control';
  private readonly TOPIC_POWER_REBOOT = 'iot/power/reboot';

  constructor(
    @Inject(forwardRef(() => PowerService)) // 🔥 Inject dengan forwardRef
    private readonly powerService: PowerService,
  ) {
    console.log('🔥 MQTT Service constructed');
  }

  onModuleInit() {
    console.log('🚀 Initializing MQTT Connection...');
    
    this.client = mqtt.connect(this.MQTT_BROKER, {
      clientId: `nest_backend_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    this.client.on('connect', () => {
      console.log('✅ MQTT Connected to broker:', this.MQTT_BROKER);
      
      this.client.subscribe(this.TOPIC_POWER_DATA, { qos: 1 }, (err) => {
        if (!err) {
          console.log(`📡 Subscribed to topic: ${this.TOPIC_POWER_DATA}`);
        } else {
          console.error('❌ Subscribe failed:', err.message);
        }
      });
    });

    this.client.on('message', async (topic, message) => {
      console.log(`📩 MQTT Message received from [${topic}]:`, message.toString());
      
      try {
        const payload = JSON.parse(message.toString());
        
        if (topic === this.TOPIC_POWER_DATA) {
          const saved = await this.powerService.save(payload);
          console.log('✅ Data saved to database with ID:', saved.id);
        }
      } catch (err) {
        console.error('❌ Error processing MQTT message:', err.message);
      }
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT Connection Error:', err.message);
    });

    this.client.on('reconnect', () => {
      console.log('🔄 MQTT Reconnecting to broker...');
    });

    this.client.on('offline', () => {
      console.log('⚠️ MQTT Client is offline');
    });
  }

  publishPowerControl(status: 'on' | 'off'): void {
    const payload = { tegangan: status };
    
    console.log(`📤 Publishing to ${this.TOPIC_POWER_CONTROL}:`, payload);
    
    this.client.publish(
      this.TOPIC_POWER_CONTROL,
      JSON.stringify(payload),
      { qos: 1, retain: false },
      (err) => {
        if (err) {
          console.error('❌ Failed to publish power control:', err.message);
        } else {
          console.log(`✅ Power control published successfully: ${status.toUpperCase()}`);
        }
      }
    );
  }

  publishReboot(): void {
    const payload = { reboot: true };
    
    console.log(`📤 Publishing to ${this.TOPIC_POWER_REBOOT}:`, payload);
    
    this.client.publish(
      this.TOPIC_POWER_REBOOT,
      JSON.stringify(payload),
      { qos: 1, retain: false },
      (err) => {
        if (err) {
          console.error('❌ Failed to publish reboot command:', err.message);
        } else {
          console.log('✅ Reboot command published successfully');
        }
      }
    );
  }

  onModuleDestroy() {
    if (this.client && this.client.connected) {
      this.client.end(true);
      console.log('🔌 MQTT Client disconnected');
    }
  }

  isConnected(): boolean {
    return this.client && this.client.connected;
  }
}