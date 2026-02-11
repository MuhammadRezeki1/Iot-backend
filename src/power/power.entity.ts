import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('power_logs')
export class PowerLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tegangan: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  arus: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  daya_watt: number; // ✅ Power in Watts (V × A × PF)

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  energi_kwh: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50 })
  frekuensi: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.95 })
  pf: number; // Power Factor

  @CreateDateColumn()
  created_at: Date;
}