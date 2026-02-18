import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { PowerService } from '../power/power.service';

// ✅ EXPORT interface agar bisa digunakan di controller
export interface PowerData {
  tegangan: number;
  arus: number;
  daya: number;
  daya_watt: number;
  energi_kwh: number;
  frekuensi: number;
  power_factor: number;
  timestamp: Date;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private connected = false;

  // ========== REALTIME DATA BUFFER ==========
  private realtimeDataBuffer: PowerData[] = [];
  private latestRealtimeData: PowerData | null = null;
  private batchInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PowerService))
    private readonly powerService: PowerService,
  ) {}

  async onModuleInit() {
    await this.connect();
    this.startBatchProcessing();
  }

  onModuleDestroy() {
    this.stopBatchProcessing();
    if (this.client) {
      this.client.end();
    }
  }

  // ========== MQTT CONNECTION ==========
  private async connect() {
    try {
      const broker = this.configService.get<string>('MQTT_BROKER', 'tcp://test.mosquitto.org:1883');
      const username = this.configService.get<string>('MQTT_USERNAME', '');
      const password = this.configService.get<string>('MQTT_PASSWORD', '');

      this.logger.log(`🔌 Connecting to MQTT Broker: ${broker}`);

      this.client = mqtt.connect(broker, {
        clientId: `nest_backend_${Math.random().toString(16).slice(2, 8)}`,
        username: username || undefined,
        password: password || undefined,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log('✅ MQTT Connected');
        this.subscribeToTopics();
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('error', (error) => {
        this.logger.error('❌ MQTT Error:', error);
        this.connected = false;
      });

      this.client.on('close', () => {
        this.connected = false;
        this.logger.warn('⚠️ MQTT Connection closed');
      });

      this.client.on('reconnect', () => {
        this.logger.log('🔄 MQTT Reconnecting to broker...');
      });

      this.client.on('offline', () => {
        this.logger.warn('⚠️ MQTT Client is offline');
      });

    } catch (error) {
      this.logger.error('❌ Failed to connect to MQTT:', error);
    }
  }

  private subscribeToTopics() {
    const dataTopic = this.configService.get<string>('MQTT_TOPIC_DATA', 'iot/power');
    
    this.client.subscribe(dataTopic, { qos: 1 }, (err) => {
      if (err) {
        this.logger.error(`❌ Failed to subscribe to ${dataTopic}:`, err);
      } else {
        this.logger.log(`✅ Subscribed to topic: ${dataTopic}`);
      }
    });
  }

  // ========== HANDLE INCOMING MESSAGES (REALTIME) ==========
  private handleMessage(topic: string, message: Buffer) {
    try {
      const payload = JSON.parse(message.toString());
      this.logger.debug(`📩 Received from ${topic}:`);
      this.logger.debug(payload);

      // Parse values
      const tegangan = Number(payload.tegangan || 220);
      const arus = Number(payload.arus || 0);
      const power_factor = Number(payload.power_factor || payload.pf || 0.95);
      const energi_kwh = Number(payload.energi_kwh || 0);
      const frekuensi = Number(payload.frekuensi || 50);

      // ✅ CALCULATE POWER: P = V × I × PF
      const daya_watt = parseFloat((tegangan * arus * power_factor).toFixed(2));

      // Store in realtime buffer (NOT saved to DB yet)
      const powerData: PowerData = {
        tegangan: tegangan,
        arus: arus,
        daya: daya_watt,
        daya_watt: daya_watt,
        energi_kwh: energi_kwh,
        frekuensi: frekuensi,
        power_factor: power_factor,
        timestamp: new Date(),
      };

      // Update latest realtime data (for dashboard)
      this.latestRealtimeData = powerData;

      // Add to buffer (will be averaged and saved every 1 minute)
      this.realtimeDataBuffer.push(powerData);

      this.logger.debug(`📊 Buffer size: ${this.realtimeDataBuffer.length} | Power: ${daya_watt}W`);

    } catch (error) {
      this.logger.error('❌ Error parsing MQTT message:', error);
    }
  }

  // ========== BATCH PROCESSING (EVERY 1 MINUTE) ==========
  private startBatchProcessing() {
    const interval = this.configService.get<number>('MQTT_BATCH_INTERVAL', 60000);
    this.logger.log(`⏰ Starting batch processing (interval: ${interval / 1000}s)`);
    
    // Save to DB every interval
    this.batchInterval = setInterval(async () => {
      await this.processBatch();
    }, interval);
  }

  private stopBatchProcessing() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
      this.logger.log('🛑 Batch processing stopped');
    }
  }

  private async processBatch() {
    if (this.realtimeDataBuffer.length === 0) {
      this.logger.debug('⚠️ No data in buffer, skipping batch');
      return;
    }

    try {
      this.logger.log(`📦 Processing batch: ${this.realtimeDataBuffer.length} records`);

      // Calculate average from buffer
      const avgData = this.calculateAverage(this.realtimeDataBuffer);

      // ✅ SAVE TO HOURLY_ENERGY TABLE
      const saved = await this.powerService.saveToHourly({
        tegangan: avgData.tegangan,
        arus: avgData.arus,
        daya_watt: avgData.daya_watt,
        energi_kwh: avgData.energi_kwh,
        pf: avgData.pf,
      });

      this.logger.log(
        `✅ Batch saved to hourly_energy | ID: ${saved.id} | ` +
        `V: ${avgData.tegangan}V | I: ${avgData.arus}A | ` +
        `P: ${avgData.daya_watt}W | E: ${avgData.energi_kwh}kWh | ` +
        `PF: ${avgData.pf}`
      );

      // Clear buffer
      this.realtimeDataBuffer = [];

    } catch (error) {
      this.logger.error('❌ Error processing batch:', error);
    }
  }

  private calculateAverage(buffer: PowerData[]): any {
    const count = buffer.length;

    const sum = buffer.reduce((acc, data) => ({
      tegangan: acc.tegangan + data.tegangan,
      arus: acc.arus + data.arus,
      daya_watt: acc.daya_watt + data.daya_watt,
      energi_kwh: acc.energi_kwh + data.energi_kwh,
      frekuensi: acc.frekuensi + data.frekuensi,
      power_factor: acc.power_factor + data.power_factor,
    }), {
      tegangan: 0,
      arus: 0,
      daya_watt: 0,
      energi_kwh: 0,
      frekuensi: 0,
      power_factor: 0,
    });

    return {
      tegangan: parseFloat((sum.tegangan / count).toFixed(2)),
      arus: parseFloat((sum.arus / count).toFixed(3)),
      daya_watt: parseFloat((sum.daya_watt / count).toFixed(2)),
      energi_kwh: parseFloat((sum.energi_kwh / count).toFixed(4)),
      frekuensi: parseFloat((sum.frekuensi / count).toFixed(2)),
      pf: parseFloat((sum.power_factor / count).toFixed(2)),
    };
  }

  // ========== PUBLIC METHODS ==========

  /**
   * Get latest realtime data (NOT from DB)
   */
  getLatestRealtimeData(): PowerData | null {
    return this.latestRealtimeData;
  }

  /**
   * Get realtime buffer size
   */
  getBufferSize(): number {
    return this.realtimeDataBuffer.length;
  }

  /**
   * Get all buffered data
   */
  getBufferedData(): PowerData[] {
    return [...this.realtimeDataBuffer];
  }

  /**
   * Check if MQTT is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Manual save - trigger batch processing immediately
   */
  async saveNow(): Promise<void> {
    this.logger.log('🔧 Manual save triggered');
    await this.processBatch();
  }

  // ========== PUBLISH METHODS ==========
  
  publishPowerControl(status: 'on' | 'off'): void {
    if (!this.client || !this.connected) {
      this.logger.error('❌ MQTT client is not connected');
      throw new Error('MQTT client is not connected');
    }

    const topic = this.configService.get<string>('MQTT_TOPIC_CONTROL', 'iot/power/control');
    const payload = JSON.stringify({ status: status });
    
    this.logger.log(`📤 Publishing to ${topic}: ${status.toUpperCase()}`);
    
    this.client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        this.logger.error(`❌ Failed to publish to ${topic}:`, err);
        throw err;
      } else {
        this.logger.log(`✅ Power control published successfully: ${status.toUpperCase()}`);
      }
    });
  }

  publishReboot(): void {
    if (!this.client || !this.connected) {
      this.logger.error('❌ MQTT client is not connected');
      throw new Error('MQTT client is not connected');
    }

    const topic = this.configService.get<string>('MQTT_TOPIC_REBOOT', 'iot/power/reboot');
    const payload = JSON.stringify({ command: 'reboot' });
    
    this.logger.log(`📤 Publishing to ${topic}: REBOOT`);
    
    this.client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        this.logger.error(`❌ Failed to publish reboot:`, err);
        throw err;
      } else {
        this.logger.log('✅ Reboot command published successfully');
      }
    });
  }
}