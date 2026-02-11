  import { Module } from '@nestjs/common';
  import { TypeOrmModule } from '@nestjs/typeorm';
  import { ConfigModule, ConfigService } from '@nestjs/config';
  import { ScheduleModule } from '@nestjs/schedule';
  import { PowerLog } from './power/power.entity';
  import { DailyEnergy } from './power/Dailyenergy.entity';
  import { WeeklyEnergy } from './power/Weeklyenergy.entity';
  import { MonthlyEnergy } from './power/Monthlyenergy.entity';
  import { HourlyEnergy } from './power/hourly-energy.entity';
  import { PowerModule } from './power/power.module';
  import { MqttModule } from './mqtt/mqtt.module';
  import { AggregationModule } from './aggregation/aggregation.module';
  import { DataInjectionModule } from './data-injection/data-injection.module';

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
      }),

      ScheduleModule.forRoot(),

      TypeOrmModule.forRootAsync({
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const dbType = configService.get<string>('DB_TYPE', 'mysql');
          const dbHost = configService.get<string>('DB_HOST', 'localhost');
          const dbPort = configService.get<string>('DB_PORT', dbType === 'postgres' ? '5432' : '3306');
          const dbUsername = configService.get<string>('DB_USERNAME', 'root');
          const dbPassword = configService.get<string>('DB_PASSWORD', '');
          const dbDatabase = configService.get<string>('DB_DATABASE', 'iot_monitoring');
          const dbSSL = configService.get<string>('DB_SSL', 'false');

          console.log('🔧 Database Configuration:');
          console.log('   Type:', dbType);
          console.log('   Host:', dbHost);
          console.log('   Port:', dbPort);
          console.log('   Database:', dbDatabase);
          console.log('   Username:', dbUsername);
          console.log('   SSL:', dbSSL);

          return {
            type: dbType as 'mysql' | 'postgres',
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
            ssl: dbSSL === 'true' ? { rejectUnauthorized: false } : false,
            synchronize: true,
            logging: ['error', 'warn', 'schema'],
            logger: 'advanced-console',
            extra: {
              max: 10,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 10000,
            },
            retryAttempts: 5,
            retryDelay: 3000,
            dropSchema: false,
            migrationsRun: false,
          };
        },
      }),

      PowerModule,
      MqttModule,
      AggregationModule,
      DataInjectionModule,
    ],
  })
  export class AppModule {}