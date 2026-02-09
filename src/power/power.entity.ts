import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('power_logs')
export class PowerLog {
  @PrimaryGeneratedColumn()
  id: number;

  // Gunakan DECIMAL untuk presisi lebih baik di PostgreSQL
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tegangan: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  arus: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'daya_watt' })
  daya_watt: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'energi_kwh' })
  energi_kwh: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  frekuensi: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'pf' })
  pf: number;

  // PostgreSQL menggunakan TIMESTAMP
  @CreateDateColumn({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at' 
  })
  created_at: Date;
}