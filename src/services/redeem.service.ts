/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';
import { v4 as uuidv4 } from 'uuid';
import { PerplexityService } from './perplexity.service';
import type { Browser } from 'puppeteer';

interface RedemptionSession {
  sessionId: string;
  email: string;
  couponId: string;
  browser: Browser;
  page: any; // Accept any for now due to PerplexityService stub
  expiresAt: number;
}

@Injectable()
export class RedeemService {
  private sessions = new Map<string, RedemptionSession>();

  constructor(
    @InjectRepository(Coupon)
    private couponRepo: Repository<Coupon>,
    private perplexityService: PerplexityService,
  ) { }

  /**
   * Start redemption: reserve coupon + puppeteer flow
   */
  async startRedeem(email: string, couponId: string, targetUrl: string) {
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

    // spin puppeteer session
    const result = await this.perplexityService.startRedemptionFlow(
      email,
      coupon.code,
      targetUrl
    );

    if (result.immediateSuccess) {
      coupon.state = 'used';
      coupon.used_by_email = email;
      coupon.used_at = new Date();
      await this.couponRepo.save(coupon);

      if (result.browser) {
        await result.browser.close();
      }

      return { success: true, message: 'Coupon redeemed immediately' };
    }

    // else wait for code
    if (!result.browser || !result.page) {
      throw new HttpException('Redemption session failed to start', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const sessionId = uuidv4();
    const session: RedemptionSession = {
      sessionId,
      email,
      couponId,
      browser: result.browser,
      page: result.page as unknown, // Replace 'unknown' with the actual expected type if known, e.g., 'Page'
      expiresAt: Date.now() + 2 * 60 * 1000,
    };

    this.sessions.set(sessionId, session);

    return {
      success: false,
      waiting_for_code: true,
      sessionId,
      expiresIn: 120,
    };
  }

  /**
   * Verify code or magic link with existing session
   */
  async verifySessionCode(sessionId: string, codeOrLink: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new HttpException('Session not found or expired', HttpStatus.NOT_FOUND);
    }
    if (Date.now() > session.expiresAt) {
      await this.cleanupSession(sessionId);
      throw new HttpException('Session expired', HttpStatus.GONE);
    }

    const success = this.perplexityService.completeRedemption(
      session.page,
      codeOrLink,
    );

    if (!success) {
      throw new HttpException('Invalid code or redemption failed', HttpStatus.BAD_REQUEST);
    }

    // mark coupon used
    const coupon = await this.couponRepo.findOne({ where: { id: session.couponId } });
    if (coupon) {
      coupon.state = 'used';
      coupon.used_by_email = session.email;
      coupon.used_at = new Date();
      await this.couponRepo.save(coupon);
    }

    await this.cleanupSession(sessionId);
    return { success: true, message: 'Coupon redeemed successfully' };
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

  /**
   * Cleanup session
   */
  private async cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        await session.browser.close();
      } catch (error) {
        void error; // Ignore cleanup errors
      }
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Cleanup expired sessions (call this periodically)
   */
  async cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        await this.cleanupSession(sessionId);
      }
    }
  }
}