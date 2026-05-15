import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './user.repository';
import { plainToInstance } from 'class-transformer';
import { ResponseUserDto } from './dto/response-user.dto';
import { HashUtil } from 'src/utils/helpers';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UsersRepository) {}

  private toResponse(data: any) {
    return plainToInstance(ResponseUserDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.userRepository.findOneUser({
      email: dto.email,
    });
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await HashUtil.hash(dto.password);

    const user = await this.userRepository.createUser({
      ...dto,
      password: hashedPassword,
    });
    return this.toResponse(user);
  }

  async findAllUser() {
    const users = await this.userRepository.findAllUser();
    return users.map((u) => this.toResponse(u));
  }

  async findOneUser(id: string) {
    const user = await this.userRepository.findOneUser({ _id: id });
    if (!user) throw new NotFoundException('User not found');
    return this.toResponse(user);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const updated = await this.userRepository.findUserByIdAndUpdate(id, dto);
    if (!updated) throw new NotFoundException('User not found');
    return this.toResponse(updated);
  }

  async removeUser(id: string) {
    return this.userRepository.deleteUser(id);
  }
}
