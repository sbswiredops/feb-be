import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL') || configService.get<string>('SUPABASE_URL')?.replace('https://', 'postgresql://postgres:@') + '/postgres',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // Always false for production safety
  logging: configService.get<string>('NODE_ENV') === 'development',
  ssl:
    configService.get<string>('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : true, // Enable SSL for Supabase connections
});