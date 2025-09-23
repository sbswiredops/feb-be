/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Check,
} from 'typeorm';

@Entity('coupons')
@Check(`"state" IN ('unused', 'reserved', 'used', 'invalid', 'unblinded', 'pending_admin')`)
export class Coupon {
  @PrimaryColumn('uuid', { name: 'id' })
  id: string;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text', default: 'unused' })
  state: 'unused' | 'reserved' | 'used' | 'invalid' | 'unblinded' | 'pending_admin';

  @Column({ type: 'jsonb', default: () => "'{}'" })
  meta: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  reserved_by_email: string | null;

  @Column({ type: 'text', nullable: true })
  reserved_by_phone: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reserved_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reserved_expires_at: Date | null;

  @Column({ type: 'text', nullable: true })
  used_by_email: string | null;

  @Column({ type: 'text', nullable: true })
  used_by_phone: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date | null;

  @Column({ type: 'boolean', default: false })
  is_unblinded: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}
