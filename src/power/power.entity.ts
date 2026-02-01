import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('power_logs')
export class PowerLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  tegangan: number;

  @Column({ type: 'float' })
  arus: number;

  @Column({ type: 'float', name: 'daya_watt' })
  daya_watt: number;

  @Column({ type: 'float', name: 'energi_kwh' })
  energi_kwh: number;

  @Column({ type: 'float' })
  frekuensi: number;

  @Column({ type: 'float', name: 'pf' })
  pf: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
