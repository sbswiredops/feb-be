/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'securepassword123',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class AdminLoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;
}

export class AddCouponDto {
  @ApiProperty({
    description: 'Coupon UUID',
    example: '750b8a33-9d1b-4726-a812-2cfc8dafbd67',
  })
  @IsUUID()
  uuid: string;

  @ApiProperty({
    description: 'Coupon code',
    example: 'SAVE20',
  })
  @IsString()
  code: string;
}

export class ResetCouponDto {
  @ApiProperty({
    description: 'Coupon UUID to reset',
    example: '750b8a33-9d1b-4726-a812-2cfc8dafbd67',
  })
  @IsUUID()
  uuid: string;
}

export class CreateAdminDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'securepassword123',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class CouponResponseDto {
  @ApiProperty({ description: 'Coupon UUID' })
  uuid: string;

  @ApiProperty({ description: 'Coupon code' })
  code: string;

  @ApiProperty({ description: 'Coupon status' })
  status: string;

  @ApiProperty({ description: 'Assigned email', nullable: true })
  assigned_email: string;

  @ApiProperty({ description: 'Assignment date', nullable: true })
  assigned_at: Date | null;

  @ApiProperty({ description: 'Usage date', nullable: true })
  used_at: Date | null;

  @ApiProperty({ description: 'Creation date' })
  created_at: Date;
}