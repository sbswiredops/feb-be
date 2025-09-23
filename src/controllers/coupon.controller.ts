import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';
import { RedeemDto, RedeemResponseDto } from '../dto/redeem.dto';
import { PerplexityService } from '../services/perplexity.service';
import { LoggingService } from '../services/logging.service';

@ApiTags('Coupons')
@Controller()
export class CouponController {
  constructor(
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    private perplexityService: PerplexityService,
    private loggingService: LoggingService,
  ) {}

  @Post('redeem')
  @ApiOperation({
    summary: 'Redeem a coupon',
    description: 'Redeem a coupon by UUID and trigger Perplexity login email',
  })
  @ApiResponse({
    status: 200,
    description: 'Coupon redeemed successfully',
    type: RedeemResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid coupon or already redeemed',
  })
  async redeemCoupon(@Body() redeemDto: RedeemDto): Promise<RedeemResponseDto> {
    const { email, uuid } = redeemDto;

    // Log the redemption attempt
    await this.loggingService.logAction('coupon_redeem_attempt', {
      email,
      uuid,
      timestamp: new Date(),
    });

    // Find the coupon
    const coupon = await this.couponRepository.findOne({
      where: { uuid },
    });

    if (!coupon) {
      await this.loggingService.logAction('coupon_redeem_failed', {
        email,
        uuid,
        reason: 'coupon_not_found',
        timestamp: new Date(),
      });
      
      throw new HttpException(
        { message: 'Invalid link: coupon not found.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check coupon status
    if (coupon.status === 'used') {
      await this.loggingService.logAction('coupon_redeem_failed', {
        email,
        uuid,
        reason: 'already_used',
        assigned_email: coupon.assigned_email,
        used_at: coupon.used_at,
        timestamp: new Date(),
      });

      throw new HttpException(
        {
          message: `This code was already redeemed on ${coupon.used_at?.toISOString()} by ${coupon.assigned_email}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (coupon.status === 'unvalid') {
      await this.loggingService.logAction('coupon_redeem_failed', {
        email,
        uuid,
        reason: 'expired_or_invalid',
        timestamp: new Date(),
      });

      throw new HttpException(
        { message: 'This code is expired or invalid.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Coupon is unused - proceed with redemption
    if (coupon.status === 'unused') {
      // Update coupon status
      coupon.status = 'used';
      coupon.assigned_email = email;
      coupon.assigned_at = new Date();
      coupon.used_at = new Date();

      await this.couponRepository.save(coupon);

      // Send Perplexity login email via US proxy
      const emailSent = await this.perplexityService.sendLoginEmail(email);

      if (!emailSent) {
        // Rollback coupon status if email failed
        coupon.status = 'unused';
        coupon.assigned_email = null;
        coupon.assigned_at = null;
        coupon.used_at = null;
        await this.couponRepository.save(coupon);

        await this.loggingService.logAction('coupon_redeem_failed', {
          email,
          uuid,
          reason: 'perplexity_email_failed',
          timestamp: new Date(),
        });

        throw new HttpException(
          { message: 'Unable to send Perplexity sign-in email. Please try again later.' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      await this.loggingService.logAction('coupon_redeem_success', {
        email,
        uuid,
        coupon_code: coupon.code,
        timestamp: new Date(),
      });

      return { message: 'Login code sent to your email via Perplexity.' };
    }

    // This should never happen, but just in case
    throw new HttpException(
      { message: 'Invalid coupon status.' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}