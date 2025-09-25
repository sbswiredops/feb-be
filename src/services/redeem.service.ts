/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';
import { PerplexityService } from './perplexity.service';


@Injectable()
export class RedeemService {


  constructor(
    @InjectRepository(Coupon)
    private couponRepo: Repository<Coupon>,
    private perplexityService: PerplexityService,
  ) { }

  /**
   * Start redemption: reserve coupon + send sign-in code via Perplexity API
   */
  async startRedeem(email: string, couponId: string, extraCookies?: string, callbackUrl?: string) {
    const coupon = await this.couponRepo.findOne({ where: { id: couponId } });
    if (!coupon) {
      throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
    }
    if (coupon.state !== 'unused') {
      throw new HttpException('Coupon not available', HttpStatus.BAD_REQUEST);
    }

    // reserve
    coupon.state = 'reserved';
    coupon.reserved_by_email = email;
    coupon.reserved_at = new Date();
    coupon.reserved_expires_at = new Date(Date.now() + 2 * 60 * 1000); // 2 min
    await this.couponRepo.save(coupon);

    // Backend triggers Perplexity sign-in code delivery
    const perplexityResult = await this.perplexityService.startRedemptionFlow(email);

    return {
      success: perplexityResult.success,
      message: perplexityResult.success
        ? 'Coupon reserved. Please check your email for the sign-in code.'
        : 'Coupon reserved, but failed to send sign-in code.',
      expiresIn: 120,
      perplexity: perplexityResult,
    };
  }

  /**
   * Verify OTP (code) from user and complete Perplexity verification. Marks coupon as used if successful.
   */
  /**
   * Verify OTP and activate coupon for the user using coupon code and email.
   */


  /**
   * Admin: list unblinded/expired
   */
  async adminListUnblinded() {
    return await this.couponRepo.find({
      where: [{ state: 'unblinded' }, { state: 'pending_admin' }],
    });
  }

  /**
   * Admin: validate (reset to unused)
   */
  async adminValidateCoupon(id: string) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    coupon.state = 'unused';
    coupon.reserved_by_email = null;
    coupon.reserved_at = null;
    coupon.reserved_expires_at = null;
    coupon.used_by_email = null;
    coupon.used_at = null;
    await this.couponRepo.save(coupon);
    return { success: true, coupon };
  }

  // ...existing code for admin utilities...

  /**
   * Verify OTP and activate coupon for the user using reserved_by_email and OTP.
   */
  async verifySessionCodeByEmail(reserved_by_email: string, otp: string) {
    // Find the reserved coupon by reserved_by_email
    const coupon = await this.couponRepo.findOne({ where: { reserved_by_email, state: 'reserved' } });
    if (!coupon) {
      throw new HttpException('No reserved coupon found for verification', HttpStatus.NOT_FOUND);
    }
    // Step 1: Complete OTP verification for the user's email
    const otpResult = await this.perplexityService.completeOtpVerification(reserved_by_email, otp);
    if (!otpResult.success) {
      throw new HttpException(otpResult.message || 'OTP verification failed', HttpStatus.BAD_REQUEST);
    }
    // (Coupon activation step can be added here if needed)
    // Mark coupon as used
    coupon.state = 'used';
    coupon.used_by_email = reserved_by_email;
    coupon.used_at = new Date();
    await this.couponRepo.save(coupon);
    return { success: true, message: 'Coupon redeemed and verified.' };
  }
}