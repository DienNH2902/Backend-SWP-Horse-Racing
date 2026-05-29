import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JockeyInvitationDocument = JockeyInvitation & Document;

export enum InvitationStatusEnum {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true })
export class JockeyInvitation {
  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
  tournamentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  horseOwnerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  jockeyId: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 100 })
  proposeContractAmount: number;

  @Prop({ required: true, min: 0, max: 100 })
  proposeOwnerShareRate: number;

  @Prop({ required: true, min: 0, max: 100 })
  proposeJockeyShareRate: number;

  @Prop({ trim: true })
  message: string;

  @Prop({
    type: String,
    enum: InvitationStatusEnum,
    default: InvitationStatusEnum.PENDING,
  })
  status: InvitationStatusEnum;

  @Prop()
  invitedAt: Date;
}

export const JockeyInvitationSchema =
  SchemaFactory.createForClass(JockeyInvitation);

/**
 * Unique partial index: chỉ cho phép 1 PENDING tại 1 thời điểm
 * cho cùng bộ (tournamentId, horseId, jockeyId).
 * Các invitation cũ status REJECTED/EXPIRED vẫn giữ lại để audit.
 */
JockeyInvitationSchema.index(
  { tournamentId: 1, horseId: 1, jockeyId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: InvitationStatusEnum.PENDING },
    name: 'unique_pending_invitation',
  },
);