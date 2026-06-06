// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';

// @Schema({ timestamps: true })
// export class UserTournament extends Document {
//   @Prop({ type: Types.ObjectId, ref: 'User', required: true })
//   userId: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
//   tournamentId: Types.ObjectId;

//   // Bạn có thể thêm trường phụ tại đây nếu cần, ví dụ: status, joinDate
// }

// export const UserTournamentSchema =
//   SchemaFactory.createForClass(UserTournament);
// // Đảm bảo không một user nào bị trùng lặp trong cùng một giải đấu
// UserTournamentSchema.index({ userId: 1, tournamentId: 1 }, { unique: true });
