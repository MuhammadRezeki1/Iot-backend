import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerController } from './power.controller';
import { PowerService } from './power.service';
import { PowerLog } from './power.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PowerLog])],
  controllers: [PowerController],
  providers: [PowerService],
  exports: [PowerService],
})
export class PowerModule {}
