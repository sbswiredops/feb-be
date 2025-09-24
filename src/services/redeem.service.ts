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
  async startRedeem(email: string, couponId: string) {
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
   * Verify code or magic link (dummy implementation, since Perplexity API does not support direct code verification)
   */
  verifySessionCode(sessionId: string, codeOrLink: string) {
    // In API-only flow, you may need to implement this differently, or handle via FE
    throw new HttpException('Code verification not supported via API. Please use the email link.', HttpStatus.NOT_IMPLEMENTED);
  }

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
}