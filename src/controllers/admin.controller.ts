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
} from '../dto/admin.dto';
import { LoggingService } from '../services/logging.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    private jwtService: JwtService,
    private loggingService: LoggingService,
  ) {}

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

    return coupons;
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
      where: [{ uuid }, { code }],
    });

    if (existingCoupon) {
      throw new HttpException(
        { message: 'Coupon with this UUID or code already exists' },
        HttpStatus.CONFLICT,
      );
    }

    const coupon = this.couponRepository.create({
      uuid,
      code,
      status: 'unused',
    });

    const savedCoupon = await this.couponRepository.save(coupon);

    await this.loggingService.logAction('admin_add_coupon', {
      uuid,
      code,
      timestamp: new Date(),
    });

    return savedCoupon;
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
      where: { uuid },
    });

    if (!coupon) {
      throw new HttpException(
        { message: 'Coupon not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Reset coupon to unused state
    coupon.status = 'unused';
    coupon.assigned_email = null;
    coupon.assigned_at = null;
    coupon.used_at = null;

    const savedCoupon = await this.couponRepository.save(coupon);

    await this.loggingService.logAction('admin_reset_coupon', {
      uuid,
      code: coupon.code,
      timestamp: new Date(),
    });

    return savedCoupon;
  }
}