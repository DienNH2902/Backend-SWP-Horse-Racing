import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PrizeDistributionDocument = HydratedDocument<PrizeDistribution>;

export enum PrizeDistributionStatus {
  PENDING = 'Pending',
  DISTRIBUTED = 'Distributed',
}

@Schema({ timestamps: true })
export class PrizeDistribution {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Prize', required: true })
  prizeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contract', required: true })
  contractId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RawResult', required: true })
  rawResultId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'HorseOwnerProfile', required: true })
  horseOwnerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JockeyProfile', required: true })
  jockeyId: Types.ObjectId;

  @Prop({ required: true })
  ownerAmount: number;

  @Prop({ required: true })
  jockeyAmount: number;

  @Prop({ enum: PrizeDistributionStatus, default: PrizeDistributionStatus.PENDING })
  status: PrizeDistributionStatus;

  @Prop({ type: Date, default: null })
  distributedAt: Date | null;
}

export const PrizeDistributionSchema =
  SchemaFactory.createForClass(PrizeDistribution);