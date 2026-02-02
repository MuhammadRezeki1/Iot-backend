import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('daily_energy')
export class DailyEnergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  date: Date;

  @Column({ type: 'float', name: 'total_energy' })
  total_energy: number;

  @Column({ type: 'float', name: 'avg_energy' })
  avg_energy: number;

  @Column({ type: 'float', name: 'max_energy' })
  max_energy: number;

  @Column({ type: 'float', name: 'min_energy' })
  min_energy: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}