import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RoundAdvancementDocument = HydratedDocument<RoundAdvancement>;

@Schema({ timestamps: true })
export class RoundAdvancement {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true })
  fromRaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true })
  toRaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  advancedAt: Date;
}

export const RoundAdvancementSchema =
  SchemaFactory.createForClass(RoundAdvancement);
RoundAdvancementSchema.index({ fromRaceId: 1, horseId: 1 }, { unique: true });
