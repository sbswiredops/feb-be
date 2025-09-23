/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsUUID, IsOptional, IsString } from 'class-validator';

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

  @ApiProperty({
    description: 'Target redemption page URL (optional)',
    example: 'https://o2perplexity.online/redeem',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetUrl?: string;
}

export class VerifyDto {
  @ApiProperty({ example: 'session-id-or-key' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  codeOrLink: string;
}

export class RedeemResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Login code sent to your email via Perplexity.',
  })
  message: string;
}
