import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('weekly_energy')
export class WeeklyEnergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  week: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'total_energy' })
  total_energy: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'avg_daily_energy' })
  avg_daily_energy: number;

  @Column({ type: 'date', nullable: true, name: 'peak_date' })
  peak_date: Date;

  @CreateDateColumn({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at' 
  })
  created_at: Date;
}