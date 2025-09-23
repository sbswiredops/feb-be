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
