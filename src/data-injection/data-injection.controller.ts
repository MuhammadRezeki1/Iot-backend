import { Controller, Post, Get, Query, Delete, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { DataInjectionService } from './data-injection.service';

@Controller('data-injection')
export class DataInjectionController {
  private readonly logger = new Logger(DataInjectionController.name);

  constructor(private readonly injectionService: DataInjectionService) {}

  // ==================== DAILY ENDPOINTS ====================

  @Post('daily')
  async injectDaily() {
    try {
      await this.injectionService.injectDailyData();
      return {
        success: true,
        message: 'Daily data injection completed successfully',
      };
    } catch (error) {
      this.logger.error('Error in daily injection:', error);
      throw new HttpException(
        'Failed to inject daily data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('daily/specific')
  async injectSpecificDate(@Query('date') date: string) {
    try {
      if (!date) {
        throw new HttpException(
          'Date parameter is required (format: YYYY-MM-DD)',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      await this.injectionService.injectSpecificDate(date);
      return {
        success: true,
        message: `Data injected for ${date}`,
      };
    } catch (error) {
      this.logger.error('Error injecting specific date:', error);
      throw new HttpException(
        error.message || 'Failed to inject data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('daily/clear')
  async clearDaily() {
    try {
      await this.injectionService.clearDailyData();
      return {
        success: true,
        message: 'Daily data cleared successfully',
      };
    } catch (error) {
      this.logger.error('Error clearing daily data:', error);
      throw new HttpException(
        'Failed to clear daily data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('daily/60days')
  async inject60Days() {
    try {
      this.logger.log('POST /data-injection/daily/60days called');
      const result = await this.injectionService.inject60DaysData();
      
      return {
        success: true,
        message: `Successfully processed ${result.total_records} daily records (Inserted: ${result.inserted}, Updated: ${result.updated})`,
        summary: result.summary,
        sample_data: result.sample_data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in 60 days injection:', error);
      throw new HttpException(
        'Failed to inject 60 days data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('daily/all')
  async getAllDaily() {
    try {
      this.logger.log('GET /data-injection/daily/all called');
      const data = await this.injectionService.getAllDailyData();
      
      return {
        success: true,
        data: data,
        count: data.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting all daily data:', error);
      throw new HttpException(
        'Failed to get daily data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== WEEKLY ENDPOINTS ====================

  @Post('weekly/dummy')
  async injectWeeklyDummy() {
    try {
      this.logger.log('POST /data-injection/weekly/dummy called');
      const result = await this.injectionService.injectWeeklyDummyData();
      
      return {
        success: true,
        message: `Successfully injected ${result.inserted} weekly records`,
        data: result.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in weekly dummy injection:', error);
      throw new HttpException(
        'Failed to inject weekly dummy data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('weekly/realistic')
  async injectWeeklyRealistic() {
    try {
      this.logger.log('POST /data-injection/weekly/realistic called');
      const result = await this.injectionService.injectWeeklyRealisticData();
      
      return {
        success: true,
        message: `Successfully injected ${result.inserted} realistic weekly records`,
        monthly_summary: result.monthly_summary,
        data: result.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in weekly realistic injection:', error);
      throw new HttpException(
        'Failed to inject realistic weekly data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('weekly/all')
  async getAllWeekly() {
    try {
      this.logger.log('GET /data-injection/weekly/all called');
      const data = await this.injectionService.getAllWeeklyData();
      
      return {
        success: true,
        data: data,
        count: data.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting all weekly data:', error);
      throw new HttpException(
        'Failed to get weekly data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('weekly/clear')
  async clearWeekly() {
    try {
      await this.injectionService.clearWeeklyData();
      return {
        success: true,
        message: 'Weekly data cleared successfully',
      };
    } catch (error) {
      this.logger.error('Error clearing weekly data:', error);
      throw new HttpException(
        'Failed to clear weekly data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('weekly/8weeks')
  async injectWeekly8Weeks() {
    try {
      this.logger.log('POST /data-injection/weekly/8weeks called');
      const result = await this.injectionService.injectWeekly8Weeks();
      
      return {
        success: true,
        message: `Successfully injected ${result.inserted} weekly records (2 months)`,
        monthly_summary: result.monthly_summary,
        data: result.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in 8 weeks injection:', error);
      throw new HttpException(
        'Failed to inject 8 weeks data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== MONTHLY ENDPOINTS ====================

  @Post('monthly/from-weekly')
  async injectMonthlyFromWeekly() {
    try {
      this.logger.log('POST /data-injection/monthly/from-weekly called');
      const result = await this.injectionService.injectMonthlyFromWeekly();
      
      return {
        success: true,
        message: `Successfully aggregated ${result.inserted} monthly records from weekly data`,
        data: result.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in monthly aggregation:', error);
      throw new HttpException(
        'Failed to aggregate monthly data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('monthly/all')
  async getAllMonthly() {
    try {
      this.logger.log('GET /data-injection/monthly/all called');
      const data = await this.injectionService.getAllMonthlyData();
      
      return {
        success: true,
        data: data,
        count: data.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting all monthly data:', error);
      throw new HttpException(
        'Failed to get monthly data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('monthly/clear')
  async clearMonthly() {
    try {
      await this.injectionService.clearMonthlyData();
      return {
        success: true,
        message: 'Monthly data cleared successfully',
      };
    } catch (error) {
      this.logger.error('Error clearing monthly data:', error);
      throw new HttpException(
        'Failed to clear monthly data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== STATS ENDPOINT ====================

  @Get('stats')
  async getStats() {
    try {
      const stats = await this.injectionService.getInjectionStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      throw new HttpException(
        'Failed to get statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}