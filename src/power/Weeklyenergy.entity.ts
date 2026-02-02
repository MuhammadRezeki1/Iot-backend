import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('weekly_energy')
export class WeeklyEnergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', name: 'week_start' })
  week_start: Date;

  @Column({ type: 'date', name: 'week_end' })
  week_end: Date;

  @Column({ type: 'float', name: 'total_energy' })
  total_energy: number;

  @Column({ type: 'float', name: 'avg_daily_energy' })
  avg_daily_energy: number;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'peak_day' })
  peak_day: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}