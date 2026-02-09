import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('daily_energy')
export class DailyEnergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'total_energy' })
  total_energy: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'avg_energy' })
  avg_energy: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'max_energy' })
  max_energy: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'min_energy' })
  min_energy: number;

  @CreateDateColumn({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at' 
  })
  created_at: Date;
}