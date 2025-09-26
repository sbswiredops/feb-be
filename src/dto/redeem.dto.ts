/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsUUID, IsString } from 'class-validator';

export class RedeemDto {
  @ApiProperty({
    description: 'User email address',
    example: 'alamindev031@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Coupon UUID (id)',
    example: '750b8a33-9d1b-4726-a812-2cfc8dafbd67',
  })
  @IsUUID()
  uuid: string;
}

export class VerifyDto {
  @ApiProperty({ description: 'Reserved email address', example: 'alamindev031@gmail.com' })
  @IsString()
  reserved_by_email: string;

  @ApiProperty({ description: 'OTP code sent to user email', example: '123456' })
  @IsString()
  otp: string;

  @ApiProperty({ description: 'Session ID from startRedeem', example: 'b1a2c3d4-5678-90ab-cdef-1234567890ab' })
  @IsString()
  sessionId: string;
}

export class RedeemResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Login code sent to your email via Perplexity.',
  })
  message: string;
}
