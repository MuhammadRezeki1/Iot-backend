import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('hourly_energy')
export class HourlyEnergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  energy: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  voltage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  current: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'power_factor' })
  power_factor: number;

  @CreateDateColumn({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at' 
  })
  created_at: Date;
}