import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PowerLog } from './power/power.entity';
import { DailyEnergy } from './power/Dailyenergy.entity';
import { WeeklyEnergy } from './power/Weeklyenergy.entity';
import { MonthlyEnergy } from './power/Monthlyenergy.entity';
import { HourlyEnergy } from './power/hourly-energy.entity';
import { PowerModule } from './power/power.module';
import { MqttModule } from './mqtt/mqtt.module';

@Module({
  imports: [
    // ============================================
    // Load Environment Variables (.env file)
    // ============================================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ============================================
    // PostgreSQL Cloud Configuration
    // ============================================
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Get config values with defaults
        const dbHost = configService.get<string>('DB_HOST', 'localhost');
        const dbPort = configService.get<string>('DB_PORT', '5432');
        const dbUsername = configService.get<string>('DB_USERNAME', 'postgres');
        const dbPassword = configService.get<string>('DB_PASSWORD', '');
        const dbDatabase = configService.get<string>('DB_DATABASE', 'iot_monitoring');
        const dbSSL = configService.get<string>('DB_SSL', 'false');

        // Log configuration for debugging
        console.log('🔧 Database Configuration:');
        console.log('   Type: postgres');
        console.log('   Host:', dbHost);
        console.log('   Port:', dbPort);
        console.log('   Database:', dbDatabase);
        console.log('   Username:', dbUsername);
        console.log('   SSL:', dbSSL);

        return {
          type: 'postgres',
          host: dbHost,
          port: parseInt(dbPort, 10),
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
          entities: [
            PowerLog,
            DailyEnergy,
            WeeklyEnergy,
            MonthlyEnergy,
            HourlyEnergy,
          ],

          // SSL Configuration (false untuk IP langsung)
          ssl: dbSSL === 'true'
            ? { rejectUnauthorized: false }
            : false,

          // Auto-create tables (set false di production)
          synchronize: true,

          // Logging
          logging: ['error', 'warn', 'schema'],

          // Connection pool settings
          extra: {
            max: 10, // Maximum connections in pool
            idleTimeoutMillis: 30000, // Close idle connections after 30s
            connectionTimeoutMillis: 5000, // Connection timeout 5s
          },
        };
      },
    }),

    PowerModule,
    MqttModule,
  ],
})
export class AppModule {}