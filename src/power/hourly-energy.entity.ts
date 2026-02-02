import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('hourly_energy')
export class HourlyEnergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'float' })
  energy: number;

  @Column({ type: 'float' })
  voltage: number;

  @Column({ type: 'float' })
  current: number;

  @Column({ type: 'float', name: 'power_factor' })
  power_factor: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}