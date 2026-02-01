import { Injectable } from '@nestjs/common';
import { DataSource, Between } from 'typeorm';
import { PowerLog } from './power.entity';

@Injectable()
export class PowerService {
  constructor(private readonly dataSource: DataSource) {}

  // ================= REALTIME =================

  async getLast7(): Promise<PowerLog[]> {
    return this.dataSource.getRepository(PowerLog).find({
      order: { created_at: 'DESC' },
      take: 7,
    });
  }

  async save(payload: Partial<PowerLog>) {
    const repo = this.dataSource.getRepository(PowerLog);
    const power = repo.create(payload);
    return repo.save(power);
  }

  // ================= HISTORY =================

  async findAll(): Promise<PowerLog[]> {
    return this.dataSource.getRepository(PowerLog).find({
      order: { created_at: 'DESC' },
      take: 1000,
    });
  }

  async getDailyData(): Promise<PowerLog[]> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return this.dataSource.getRepository(PowerLog).find({
      where: { created_at: Between(yesterday, now) },
      order: { created_at: 'ASC' },
    });
  }

  async getWeeklyData(): Promise<any[]> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.dataSource
      .getRepository(PowerLog)
      .createQueryBuilder('p')
      .select('DATE(p.created_at)', 'date')
      .addSelect('SUM(p.energi_kwh)', 'total_energy')
      .addSelect('AVG(p.energi_kwh)', 'avg_energy')
      .where('p.created_at BETWEEN :start AND :end', {
        start: weekAgo,
        end: now,
      })
      .groupBy('DATE(p.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getMonthlyData(): Promise<any[]> {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.dataSource
      .getRepository(PowerLog)
      .createQueryBuilder('p')
      .select('DATE(p.created_at)', 'date')
      .addSelect('SUM(p.energi_kwh)', 'total_energy')
      .addSelect('AVG(p.energi_kwh)', 'avg_energy')
      .addSelect('MAX(p.energi_kwh)', 'max_energy')
      .where('p.created_at BETWEEN :start AND :end', {
        start: monthAgo,
        end: now,
      })
      .groupBy('DATE(p.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getStatistics(days = 30): Promise<any> {
    const now = new Date();
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const stats = await this.dataSource
      .getRepository(PowerLog)
      .createQueryBuilder('p')
      .select('SUM(p.energi_kwh)', 'total_energy')
      .addSelect('AVG(p.energi_kwh)', 'avg_daily')
      .addSelect('MAX(p.energi_kwh)', 'peak')
      .where('p.created_at BETWEEN :start AND :end', {
        start: past,
        end: now,
      })
      .getRawOne();

    const peakHour = await this.dataSource
      .getRepository(PowerLog)
      .createQueryBuilder('p')
      .select('HOUR(p.created_at)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('p.created_at BETWEEN :start AND :end', {
        start: past,
        end: now,
      })
      .groupBy('HOUR(p.created_at)')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    return {
      total_energy: Number(stats?.total_energy || 0),
      avg_daily_usage: Number(stats?.avg_daily || 0),
      peak_usage: Number(stats?.peak || 0),
      peak_hour: peakHour ? `${peakHour.hour}:00` : null,
    };
  }

  async findByDateRange(start: Date, end: Date): Promise<PowerLog[]> {
    return this.dataSource.getRepository(PowerLog).find({
      where: { created_at: Between(start, end) },
      order: { created_at: 'ASC' },
    });
  }
}
