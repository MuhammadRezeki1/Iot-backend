import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('monthly_energy')
export class MonthlyEnergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'total_energy' })
  total_energy: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'avg_daily_energy' })
  avg_daily_energy: number;

  @Column({ type: 'date', nullable: true, name: 'peak_date' })
  peak_date?: Date;  // ✅ Made optional to support null values

  @CreateDateColumn({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at' 
  })
  created_at: Date;
}