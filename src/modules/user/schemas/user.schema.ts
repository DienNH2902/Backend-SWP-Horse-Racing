import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GenderEnum } from 'src/constants/genderEnum.enum';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { AccountStatusEnum } from 'src/constants/accountStatusEnum.enum';

export type UserDocument = HydratedDocument<User>;
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  address: string;

  @Prop()
  avatar: string;

  @Prop({ type: Date })
  dateOfBirth: Date;

  @Prop({ type: Number, required: true, default: GenderEnum.MALE })
  gender: GenderEnum; // 0: Female, 1: Male, 2: Other

  @Prop({ type: String, required: true, default: RoleEnum.SPECTATOR })
  role: RoleEnum; // 'Admin', 'Horse Owner', 'Jockey', 'Referee', 'Spectator'

  @Prop({ type: String, required: true, default: AccountStatusEnum.ACTIVE })
  status: AccountStatusEnum; // 'Active', 'Inactive', 'Banned'

  // @Prop({ default: null })
  // refreshToken: string;
}
export const UserSchema = SchemaFactory.createForClass(User);

// Liên kết ảo với bảng SpectatorProfile
UserSchema.virtual('spectatorProfile', {
  ref: 'SpectatorProfile', // Tên Model của bảng phụ tương ứng
  localField: '_id', // Trường định danh tại bảng User hiện tại
  foreignField: 'userId', // Trường liên kết nằm ở bảng phụ
  justOne: true, // Mối quan hệ 1-1 (chỉ lấy 1 bản ghi duy nhất)
});

// Liên kết ảo với bảng JockeyProfile
UserSchema.virtual('jockeyProfile', {
  ref: 'JockeyProfile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

// Liên kết ảo với bảng RefereeProfile
UserSchema.virtual('refereeProfile', {
  ref: 'RefereeProfile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

// Liên kết ảo với bảng HorseOwnerProfile
UserSchema.virtual('horseOwnerProfile', {
  ref: 'HorseOwnerProfile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});
