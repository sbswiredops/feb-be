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


  async startRedeem(email: string, couponId: string, extraCookies?: string, callbackUrl?: string) {
    const coupon = await this.couponRepo.findOne({ where: { id: couponId } });
    if (!coupon) {
        throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
    }

    if (coupon.state === 'used') {
        return {
            success: false,
            message: `This coupon has already been used by ${coupon.used_by_email || 'N/A'} on ${coupon.used_at ? coupon.used_at.toISOString() : 'N/A'}.`,
            state: 'used',
            used_by_email: coupon.used_by_email,
            used_at: coupon.used_at,
        };
    }

    if (coupon.state === 'reserved') {
        return {
            success: false,
            message: 'This coupon is already reserved. Please contact admin.',
            state: 'reserved',
            reserved_by_email: coupon.reserved_by_email,
            reserved_at: coupon.reserved_at,
            reserved_expires_at: coupon.reserved_expires_at,
        };
    }

    if (coupon.state === 'unused') {
        console.log('Coupon state before activation:', coupon);
        const activateResult = await this.perplexityService.activateCouponOnPerplexity(coupon.code, email);
        console.log('Activate result:', activateResult);
        if (!activateResult.success) {
            return {
                success: false,
                message: 'Failed to activate coupon on Perplexity. Please try again later.',
                error: activateResult.message,
            };
        }
        coupon.state = 'reserved';
        coupon.reserved_by_email = email;
        coupon.reserved_at = new Date();
        coupon.reserved_expires_at = new Date(Date.now() + 2 * 60 * 1000); // 2 min
        await this.couponRepo.save(coupon);
        console.log('Coupon after reserve:', coupon);
        return {
            success: true,
            message: 'Coupon activated and reserved. Please check your email for the sign-in code.',
            expiresIn: 120,
            sessionId: activateResult.sessionId, // FE will need this for OTP submit
        };
    }

    // Fallback
    return {
        success: false,
        message: 'Invalid coupon state.',
        state: coupon.state,
    };
  }

 


  async adminListUnblinded() {
    return await this.couponRepo.find({
      where: [{ state: 'unblinded' }, { state: 'pending_admin' }],
    });
  }

 
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

  async verifySessionCodeByEmail(reserved_by_email: string, otp: string, sessionId: string) {
    const coupon = await this.couponRepo.findOne({ where: { reserved_by_email, state: 'reserved' } });
    if (!coupon) {
      throw new HttpException('No reserved coupon found for verification', HttpStatus.NOT_FOUND);
    }
    // OTP submit directly to perplexityService (no completeOtpVerification needed)
    const otpResult = await this.perplexityService.submitOtp(sessionId, otp);
    if (!otpResult.success) {
      throw new HttpException(otpResult.message || 'OTP verification failed', HttpStatus.BAD_REQUEST);
    }
    coupon.state = 'used';
    coupon.used_by_email = reserved_by_email;
    coupon.used_at = new Date();
    await this.couponRepo.save(coupon);
    return { success: true, message: 'Coupon redeemed and verified.' };
  }
}