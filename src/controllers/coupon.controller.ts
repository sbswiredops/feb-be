/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RedeemDto, VerifyDto, RedeemResponseDto } from '../dto/redeem.dto';
import { RedeemService } from '../services/redeem.service';

@ApiTags('Coupons')
@Controller('api/v1/coupons')
export class CouponController {
  constructor(private readonly redeemService: RedeemService) { }

  @Post('redeem/start')
  @ApiOperation({
    summary: 'Start coupon redemption',
    description:
      'Takes email + couponId, reserves coupon, triggers Perplexity redemption (via Puppeteer US proxy). Returns either immediate success or waiting_for_code with sessionId.',
  })
  @ApiResponse({
    status: 200,
    description: 'Redemption started',
    type: RedeemResponseDto,
  })
  async startRedeem(@Body() redeemDto: RedeemDto) {
    const { email, uuid } = redeemDto;
    if (!uuid) {
      throw new HttpException('Missing couponId', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.redeemService.startRedeem(email, uuid);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Redemption start error';
      const status =
        err && typeof err === 'object' && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
          ? (err as { status: number }).status
          : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(message, status);
    }
  }

  // @Post('redeem/verify')
  // @ApiOperation({
  //   summary: 'Verify redemption code',
  //   description:
  //     'Takes sessionId + code/magic link from email. Uses Puppeteer session to complete redemption. Marks coupon used if successful.',
  // })
  // async verify(@Body() verifyDto: VerifyDto) {
  //   try {
  //     return await this.redeemService.verifySessionCode(
  //       verifyDto.sessionId,
  //       verifyDto.codeOrLink,
  //     );
  //   } catch (err: unknown) {
  //     let message = 'Verification error';
  //     let status = HttpStatus.INTERNAL_SERVER_ERROR;
  //     if (
  //       err &&
  //       typeof err === 'object' &&
  //       'message' in err &&
  //       typeof (err as { message?: unknown }).message === 'string'
  //     ) {
  //       message = (err as { message: string }).message;
  //     }
  //     if (
  //       err &&
  //       typeof err === 'object' &&
  //       'status' in err &&
  //       typeof (err as { status?: unknown }).status === 'number'
  //     ) {
  //       status = (err as { status: number }).status;
  //     }
  //     throw new HttpException(message, status);
  //   }
  // }

  @Get('redeem/status/:sessionId')
  @ApiOperation({
    summary: 'Check redemption session status',
    description:
      'Optional endpoint for FE to poll whether a redemption session is still alive or expired.',
  })
  status(@Param('sessionId') sessionId: string) {
    // Type guard to safely access sessions
    const hasSessions =
      typeof ((this.redeemService as unknown) as { sessions?: Map<string, unknown> }).sessions === 'object' &&
      typeof ((this.redeemService as unknown) as { sessions?: Map<string, unknown> }).sessions?.has === 'function';
    const exists = hasSessions
      ? ((this.redeemService as unknown) as { sessions: Map<string, unknown> }).sessions?.has(sessionId)
      : false;
    return { exists };
  }

  // --- Admin utilities ---
  @Get('redeem/admin/unblinded')
  @ApiOperation({
    summary: 'List unblinded/expired coupons',
    description:
      'Admin-only endpoint to see which coupons expired mid-process and need revalidation.',
  })
  async listUnblinded() {
    return this.redeemService.adminListUnblinded();
  }

  @Post('redeem/admin/validate/:id')
  @ApiOperation({
    summary: 'Re-validate a coupon',
    description:
      'Admin-only: reset an unblinded coupon back to unused so it can be redeemed again.',
  })
  async validate(@Param('id') id: string) {
    return this.redeemService.adminValidateCoupon(id);
  }
}
