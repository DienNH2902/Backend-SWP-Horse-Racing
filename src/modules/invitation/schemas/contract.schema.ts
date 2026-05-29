import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContractDocument = Contract & Document;

export enum ContractStatusEnum {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  BREACHED = 'BREACHED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Contract {
  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
  tournamentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  horseOwnerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  jockeyId: Types.ObjectId;

  /**
   * Tham chiếu lại invitation gốc tạo ra contract này
   */
  @Prop({ type: Types.ObjectId, ref: 'JockeyInvitation', required: true })
  jockeyInvitationId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  contractAmount: number;

  @Prop({ required: true, min: 0, max: 100 })
  ownerShareRate: number;

  @Prop({ required: true, min: 0, max: 100 })
  jockeyShareRate: number;

  @Prop({
    type: String,
    enum: ContractStatusEnum,
    default: ContractStatusEnum.ACTIVE,
  })
  status: ContractStatusEnum;

  @Prop()
  signedAt: Date;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

/**
 * Mỗi cặp (tournament, horse, jockey) chỉ có 1 contract ACTIVE
 */
ContractSchema.index(
  { tournamentId: 1, horseId: 1, jockeyId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: ContractStatusEnum.ACTIVE },
    name: 'unique_active_contract',
  },
);