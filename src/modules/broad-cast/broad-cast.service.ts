import { Injectable } from '@nestjs/common';
import { CreateBroadCastDto } from './dto/create-broad-cast.dto';
import { UpdateBroadCastDto } from './dto/update-broad-cast.dto';

@Injectable()
export class BroadCastService {
  create(createBroadCastDto: CreateBroadCastDto) {
    return 'This action adds a new broadCast';
  }

  findAll() {
    return `This action returns all broadCast`;
  }

  findOne(id: number) {
    return `This action returns a #${id} broadCast`;
  }

  update(id: number, updateBroadCastDto: UpdateBroadCastDto) {
    return `This action updates a #${id} broadCast`;
  }

  remove(id: number) {
    return `This action removes a #${id} broadCast`;
  }
}
