import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { TournamentStatusEnum } from 'src/constants/tournamentStatusEnum.enum';

export type TournamentDocument = HydratedDocument<Tournament>;

@Schema({ timestamps: true })
export class Tournament extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false, trim: true, default: null })
  imageUrl: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  location: string;

  @Prop({
    required: true,
    enum: TournamentStatusEnum,
    default: TournamentStatusEnum.PREPARING,
  })
  status: TournamentStatusEnum;

  @Prop({ required: true, min: 1 })
  totalRounds: number; // Tổng số vòng đấu (vòng loại, bán kết, chung kết...)

  @Prop({ required: true, min: 2 })
  horsesPerRace: number; // Số lượng ngựa tối đa trong một lượt chạy

  @Prop({ required: true, min: 1 })
  totalRaces: number; // Tổng số trận đấu/lượt chạy trong toàn giải

  @Prop({ required: true, min: 0 })
  entryFee: number;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);
