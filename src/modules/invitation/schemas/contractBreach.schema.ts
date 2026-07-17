import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BreachingPartyEnum } from 'src/constants/breachingPartyEnum.enum';
import { BreachActionTypeEnum } from 'src/constants/breachingTypeEnum.enum';
import { BreachStatusEnum } from 'src/constants/breachStatusEnum.enum';

export type ContractBreachDocument = ContractBreach & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })
export class ContractBreach {
  @Prop({ type: Types.ObjectId, ref: 'Contract', required: true })
  contractId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporterId: Types.ObjectId;

  @Prop({ type: String, enum: BreachingPartyEnum, required: true })
  breachingParty: BreachingPartyEnum;

  @Prop({ type: String, enum: BreachActionTypeEnum, required: true })
  actionType: BreachActionTypeEnum;

  @Prop({
    type: String,
    enum: BreachStatusEnum,
    default: BreachStatusEnum.PENDING,
  })
  status: BreachStatusEnum;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: Number, required: true, default: 0 })
  compensationAmount: number;

  @Prop({ type: Date })
  resolvedAt: Date;
}

export const ContractBreachSchema =
  SchemaFactory.createForClass(ContractBreach);
