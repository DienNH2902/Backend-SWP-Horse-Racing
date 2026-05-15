import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GenderEnum } from 'src/constants/genderEnum.enum';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { AccountStatusEnum } from 'src/constants/accountStatusEnum.enum';

export type UserDocument = HydratedDocument<User>;
@Schema({ timestamps: true })
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

  // Foreign Keys
  @Prop({ type: Number, required: true, default: GenderEnum.MALE })
  gender: GenderEnum; // 0: Female, 1: Male, 2: Other

  @Prop({ type: String, required: true, default: RoleEnum.SPECTATOR })
  role: RoleEnum; // 'Admin', 'Horse Owner', 'Jockey', 'Referee', 'Spectator'

  @Prop({ type: String, required: true, default: AccountStatusEnum.ACTIVE })
  status: AccountStatusEnum; // 'Active', 'Inactive', 'Banned'

  // Role-Specific Fields
  @Prop()
  licenseNumber: string; // For Jockey/Referee

  @Prop({ default: 0 })
  experienceYears: number;

  @Prop()
  weight: number; // For Jockey

  @Prop()
  stableName: string; // For Horse Owner

  @Prop({ default: 0 })
  balance: number; // For Spectator (virtual rewards)
}
export const UserSchema = SchemaFactory.createForClass(User);
