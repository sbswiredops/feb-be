import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Check,
} from 'typeorm';

@Entity('coupons')
@Check(`"status" IN ('unused', 'used', 'unvalid')`)
export class Coupon {
  @PrimaryColumn('uuid')
  uuid: string;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text' })
  status: 'unused' | 'used' | 'unvalid';

  @Column({ type: 'text', nullable: true })
  assigned_email: string;

  @Column({ type: 'timestamptz', nullable: true })
  assigned_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}