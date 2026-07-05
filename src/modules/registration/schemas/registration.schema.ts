import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RegistrationStatusEnum } from 'src/constants/registrationStatus.enum';

export type RegistrationDocument = Registration & Document;

@Schema({ timestamps: true })
export class Registration {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JockeyInvitation', required: true })
  jockeyInvitationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
  tournamentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  jockeyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race' })
  raceId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  entryFee: number;

  @Prop({ min: 1 })
  gateNumber: number;

  @Prop({
    type: String,
    enum: RegistrationStatusEnum,
    default: RegistrationStatusEnum.PENDING,
  })
  status: RegistrationStatusEnum;

  @Prop({ default: () => new Date() })
  registeredAt: Date;

  @Prop()
  confirmedAt: Date;

  @Prop({ trim: true })
  rejectedReason: string;

  @Prop()
  rejectedAt: Date;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);

/**
 * Unique partial index: mỗi cặp (tournament, horse) chỉ có 1 registration
 * không ở trạng thái rejected — tránh đăng ký trùng.
 * Registration bị rejected vẫn giữ lại để audit.
 */
RegistrationSchema.index(
  { tournamentId: 1, horseId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $ne: RegistrationStatusEnum.REJECTED },
    },
    name: 'unique_active_registration',
  },
);
