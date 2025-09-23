import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CouponController } from './controllers/coupon.controller';
import { AdminController } from './controllers/admin.controller';
import { PerplexityService } from './services/perplexity.service';
import { LoggingService } from './services/logging.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { User } from './entities/user.entity';
import { Coupon } from './entities/coupon.entity';
import { Log } from './entities/log.entity';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    TypeOrmModule.forFeature([User, Coupon, Log]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AppController, CouponController, AdminController],
  providers: [AppService, PerplexityService, LoggingService, JwtStrategy],
})
export class AppModule {}
