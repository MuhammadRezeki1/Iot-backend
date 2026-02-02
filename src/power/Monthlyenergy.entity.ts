import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('monthly_energy')
export class MonthlyEnergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'float', name: 'total_energy' })
  total_energy: number;

  @Column({ type: 'float', name: 'avg_daily_energy' })
  avg_daily_energy: number;

  @Column({ type: 'date', nullable: true, name: 'peak_date' })
  peak_date: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}