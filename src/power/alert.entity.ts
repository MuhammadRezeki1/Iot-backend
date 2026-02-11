// import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

// export enum AlertSeverity {
//   INFO = 'info',
//   WARNING = 'warning',
//   CRITICAL = 'critical',
// }

// export enum AlertType {
//   HIGH_CONSUMPTION = 'high_consumption',
//   LOW_POWER_FACTOR = 'low_power_factor',
//   UNUSUAL_PATTERN = 'unusual_pattern',
//   PEAK_USAGE = 'peak_usage',
// }

// @Entity('alerts')
// export class Alert {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column({
//     type: 'enum',
//     enum: AlertType,
//   })
//   type: AlertType;

//   @Column({
//     type: 'enum',
//     enum: AlertSeverity,
//   })
//   severity: AlertSeverity;

//   @Column('text')
//   message: string;

//   @Column('decimal', { precision: 10, scale: 2 })
//   value: number;

//   @Column('decimal', { precision: 10, scale: 2, nullable: true })
//   threshold: number;

//   @Column('date')
//   date: Date;

//   @CreateDateColumn()
//   created_at: Date;

//   @Column({ default: false })
//   is_read: boolean;
// }