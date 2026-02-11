import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AlertData {
  id: number;
  type: string;
  severity: string;
  message: string;
  value: number;
  threshold: number;
  date: string;
  week_info: string;
  created_at: string;
  is_read: boolean;
}

export interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unread: number;
  by_type: {
    high_consumption: number;
    low_power_factor: number;
    unusual_pattern: number;
    peak_usage: number;
  };
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly dataSource: DataSource) {}

  async generateAlertsFromLast10Days(): Promise<AlertData[]> {
    try {
      this.logger.log('🔔 Fetching last 10 weeks from weekly_energy...');

      const weeklyQuery = `
        SELECT 
          id,
          year,
          week,
          total_energy,
          avg_daily_energy,
          peak_date,
          created_at
        FROM weekly_energy
        ORDER BY year DESC, week DESC
        LIMIT 10
      `;

      const weeklyData = await this.dataSource.query(weeklyQuery);

      this.logger.log(`✅ Found ${weeklyData.length} weeks of data`);

      if (weeklyData.length === 0) {
        this.logger.warn('⚠️ No weekly data found');
        return [];
      }

      const alerts: AlertData[] = [];

      // Hitung rata-rata konsumsi mingguan
      const totalEnergies = weeklyData.map((w: any) => parseFloat(w.total_energy));
      const avgWeeklyConsumption = totalEnergies.reduce((a: number, b: number) => a + b, 0) / totalEnergies.length;
      
      // ✅ THRESHOLD LEBIH RENDAH - agar lebih mudah trigger alerts
      const highThreshold = avgWeeklyConsumption * 1.05; // 5% di atas rata-rata (was 1.2)
      const lowThreshold = avgWeeklyConsumption * 0.9;   // 10% di bawah rata-rata (was 0.7)

      this.logger.log(`📊 Average weekly consumption: ${avgWeeklyConsumption.toFixed(2)} kWh`);
      this.logger.log(`📊 High threshold: ${highThreshold.toFixed(2)} kWh (5% above avg)`);
      this.logger.log(`📊 Low threshold: ${lowThreshold.toFixed(2)} kWh (10% below avg)`);

      // Generate alerts untuk setiap minggu
      weeklyData.reverse().forEach((week: any, index: number) => {
        const energy = parseFloat(week.total_energy);
        const avgDaily = parseFloat(week.avg_daily_energy);
        const weekLabel = `Minggu ${week.week}, ${week.year}`;
        const peakDate = week.peak_date || new Date();

        this.logger.log(`Checking week ${week.week}: ${energy.toFixed(2)} kWh (high>${highThreshold.toFixed(2)}, low<${lowThreshold.toFixed(2)})`);

        // Alert 1: HIGH CONSUMPTION
        if (energy > highThreshold) {
          this.logger.log(`🔴 HIGH CONSUMPTION ALERT: ${energy.toFixed(2)} > ${highThreshold.toFixed(2)}`);
          alerts.push({
            id: alerts.length + 1,
            type: 'high_consumption',
            severity: 'warning',
            message: `${weekLabel}: Konsumsi tinggi ${energy.toFixed(2)} kWh (rata-rata: ${avgWeeklyConsumption.toFixed(2)} kWh)`,
            value: energy,
            threshold: highThreshold,
            date: new Date(peakDate).toISOString().split('T')[0],
            week_info: weekLabel,
            created_at: new Date().toISOString(),
            is_read: false,
          });
        }

        // Alert 2: UNUSUAL PATTERN (konsumsi rendah)
        if (energy < lowThreshold && energy > 0) {
          this.logger.log(`🟡 UNUSUAL PATTERN ALERT: ${energy.toFixed(2)} < ${lowThreshold.toFixed(2)}`);
          alerts.push({
            id: alerts.length + 1,
            type: 'unusual_pattern',
            severity: 'info',
            message: `${weekLabel}: Konsumsi tidak biasa ${energy.toFixed(2)} kWh (di bawah rata-rata)`,
            value: energy,
            threshold: lowThreshold,
            date: new Date(peakDate).toISOString().split('T')[0],
            week_info: weekLabel,
            created_at: new Date().toISOString(),
            is_read: false,
          });
        }

        // Alert 3: PEAK DAILY USAGE
        const avgDailyThreshold = (avgWeeklyConsumption / 7) * 1.1; // 10% above average daily
        if (avgDaily > avgDailyThreshold) {
          this.logger.log(`🔴 PEAK USAGE ALERT: ${avgDaily.toFixed(2)} > ${avgDailyThreshold.toFixed(2)}`);
          alerts.push({
            id: alerts.length + 1,
            type: 'peak_usage',
            severity: 'critical',
            message: `${weekLabel}: Puncak konsumsi harian ${avgDaily.toFixed(2)} kWh/hari (threshold: ${avgDailyThreshold.toFixed(2)} kWh)`,
            value: avgDaily,
            threshold: avgDailyThreshold,
            date: new Date(peakDate).toISOString().split('T')[0],
            week_info: weekLabel,
            created_at: new Date().toISOString(),
            is_read: false,
          });
        }
      });

      // ALWAYS add at least one demo alert if no real alerts
      if (alerts.length === 0) {
        this.logger.log('⚠️ No alerts generated from thresholds, adding summary alert');
        
        // Find highest consumption week
        const maxWeek = weeklyData.reduce((prev: any, current: any) => 
          (parseFloat(current.total_energy) > parseFloat(prev.total_energy)) ? current : prev
        );
        
        alerts.push({
          id: 1,
          type: 'high_consumption',
          severity: 'info',
          message: `Minggu ${maxWeek.week}, ${maxWeek.year}: Konsumsi tertinggi ${parseFloat(maxWeek.total_energy).toFixed(2)} kWh dalam 10 minggu terakhir`,
          value: parseFloat(maxWeek.total_energy),
          threshold: avgWeeklyConsumption,
          date: new Date(maxWeek.peak_date || new Date()).toISOString().split('T')[0],
          week_info: `Minggu ${maxWeek.week}, ${maxWeek.year}`,
          created_at: new Date().toISOString(),
          is_read: false,
        });

        // Find lowest consumption week
        const minWeek = weeklyData.reduce((prev: any, current: any) => 
          (parseFloat(current.total_energy) < parseFloat(prev.total_energy)) ? current : prev
        );
        
        alerts.push({
          id: 2,
          type: 'unusual_pattern',
          severity: 'info',
          message: `Minggu ${minWeek.week}, ${minWeek.year}: Konsumsi terendah ${parseFloat(minWeek.total_energy).toFixed(2)} kWh dalam 10 minggu terakhir`,
          value: parseFloat(minWeek.total_energy),
          threshold: avgWeeklyConsumption,
          date: new Date(minWeek.peak_date || new Date()).toISOString().split('T')[0],
          week_info: `Minggu ${minWeek.week}, ${minWeek.year}`,
          created_at: new Date().toISOString(),
          is_read: false,
        });
      }

      this.logger.log(`✅ Generated ${alerts.length} total alerts`);
      return alerts;

    } catch (error) {
      this.logger.error('❌ Error generating alerts:', error);
      this.logger.error('Stack:', error.stack);
      return [];
    }
  }

  async getAlertSummary(): Promise<AlertSummary> {
    try {
      const alerts = await this.generateAlertsFromLast10Days();

      const summary: AlertSummary = {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
        unread: alerts.filter(a => !a.is_read).length,
        by_type: {
          high_consumption: alerts.filter(a => a.type === 'high_consumption').length,
          low_power_factor: alerts.filter(a => a.type === 'low_power_factor').length,
          unusual_pattern: alerts.filter(a => a.type === 'unusual_pattern').length,
          peak_usage: alerts.filter(a => a.type === 'peak_usage').length,
        },
      };

      this.logger.log(`📊 Summary: ${summary.total} total alerts (${summary.critical} critical, ${summary.warning} warning, ${summary.info} info)`);

      return summary;
    } catch (error) {
      this.logger.error('Error getting summary:', error);
      return {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
        unread: 0,
        by_type: {
          high_consumption: 0,
          low_power_factor: 0,
          unusual_pattern: 0,
          peak_usage: 0,
        },
      };
    }
  }
}