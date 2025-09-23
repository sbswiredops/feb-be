/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Coupon } from '../entities/coupon.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AdminLoginDto,
  AdminLoginResponseDto,
  AddCouponDto,
  ResetCouponDto,
  CouponResponseDto,
  CreateAdminDto,
} from '../dto/admin.dto';
import { ApiBody } from '@nestjs/swagger';
import { LoggingService } from '../services/logging.service';

import { randomUUID } from 'crypto';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    private jwtService: JwtService,
    private loggingService: LoggingService,
  ) { }

  @Post('create-admin')
  @ApiOperation({
    summary: 'Create new admin',
    description: 'Create a new admin user (only accessible by admins)',
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Admin created successfully',
    schema: {
      example: {
        id: 'uuid',
        email: 'admin@gmail.com',
        role: 'admin',
        created_at: '2025-09-23T00:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createAdmin(@Body() body: CreateAdminDto) {
    if (!body || typeof body !== 'object') {
      throw new HttpException(
        { message: 'Request body is required and must be an object' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { email, password } = body;
    if (!email || !password) {
      throw new HttpException(
        { message: 'Both email and password are required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if user already exists
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new HttpException(
        { message: 'User with this email already exists' },
        HttpStatus.CONFLICT,
      );
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      id: randomUUID(),
      email,
      password_hash,
      role: 'admin',
      created_at: new Date(),
    });
    const saved = await this.userRepository.save(user);

    await this.loggingService.logAction('admin_create_admin', {
      created_email: email,
      created_id: saved.id,
      timestamp: new Date(),
    });

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      created_at: saved.created_at,
    };
  }

  @Post('login')
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate admin user and return JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AdminLoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email, role: 'admin' },
    });

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      await this.loggingService.logAction('admin_login_failed', {
        email,
        timestamp: new Date(),
      });

      throw new HttpException(
        { message: 'Invalid credentials' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);

    await this.loggingService.logAction('admin_login_success', {
      email,
      user_id: user.id,
      timestamp: new Date(),
    });

    return { access_token };
  }

  @Get('coupons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all coupons',
    description: 'Get all coupons with their status and assignment details',
  })
  @ApiResponse({
    status: 200,
    description: 'List of coupons',
    type: [CouponResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getCoupons(): Promise<CouponResponseDto[]> {
    const coupons = await this.couponRepository.find({
      order: { created_at: 'DESC' },
    });

    await this.loggingService.logAction('admin_view_coupons', {
      count: coupons.length,
      timestamp: new Date(),
    });

    return coupons.map(coupon => ({
      uuid: coupon.id,
      code: coupon.code,
      status: coupon.state,
      assigned_email: coupon.used_by_email ?? '',
      assigned_at: null, // No direct field, set to null or map if you add one
      used_at: coupon.used_at,
      created_at: coupon.created_at,
    }));
  }

  @Post('add-coupon')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add new coupon',
    description: 'Create a new coupon with specified UUID and code',
  })
  @ApiResponse({
    status: 201,
    description: 'Coupon created successfully',
    type: CouponResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async addCoupon(@Body() addCouponDto: AddCouponDto): Promise<CouponResponseDto> {
    const { uuid, code } = addCouponDto;

    // Check if coupon already exists
    const existingCoupon = await this.couponRepository.findOne({
      where: [{ id: uuid }, { code }],
    });

    if (existingCoupon) {
      throw new HttpException(
        { message: 'Coupon with this UUID or code already exists' },
        HttpStatus.CONFLICT,
      );
    }

    const coupon = this.couponRepository.create({
      id: uuid,
      code,
      state: 'unused',
    });

    const savedCoupon = await this.couponRepository.save(coupon);

    await this.loggingService.logAction('admin_add_coupon', {
      uuid,
      code,
      timestamp: new Date(),
    });

    return {
      uuid: savedCoupon.id,
      code: savedCoupon.code,
      status: savedCoupon.state,
      assigned_email: savedCoupon.used_by_email ?? '',
      assigned_at: null,
      used_at: savedCoupon.used_at,
      created_at: savedCoupon.created_at,
    };
  }

  @Post('reset-coupon')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset coupon',
    description: 'Reset a coupon back to unused status',
  })
  @ApiResponse({
    status: 200,
    description: 'Coupon reset successfully',
    type: CouponResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async resetCoupon(@Body() resetCouponDto: ResetCouponDto): Promise<CouponResponseDto> {
    const { uuid } = resetCouponDto;

    const coupon = await this.couponRepository.findOne({
      where: { id: uuid },
    });

    if (!coupon) {
      throw new HttpException(
        { message: 'Coupon not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Reset coupon to unused state
    coupon.state = 'unused';
    coupon.used_by_email = null;
    coupon.used_at = null;

    const savedCoupon = await this.couponRepository.save(coupon);

    await this.loggingService.logAction('admin_reset_coupon', {
      uuid,
      code: coupon.code,
      timestamp: new Date(),
    });

    return {
      uuid: savedCoupon.id,
      code: savedCoupon.code,
      status: savedCoupon.state,
      assigned_email: savedCoupon.used_by_email ?? '',
      assigned_at: null,
      used_at: savedCoupon.used_at,
      created_at: savedCoupon.created_at,
    };
  }
}