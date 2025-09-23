import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from '../entities/log.entity';

@Injectable()
export class LoggingService {
  constructor(
    @InjectRepository(Log)
    private logRepository: Repository<Log>,
  ) {}

  async logAction(action: string, details: any = {}): Promise<void> {
    try {
      const log = this.logRepository.create({
        action,
        details,
      });
      await this.logRepository.save(log);
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  }

  async getRecentLogs(limit: number = 100): Promise<Log[]> {
    return this.logRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}