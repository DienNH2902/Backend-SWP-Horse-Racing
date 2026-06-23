import { Injectable } from '@nestjs/common';
import { CreatePrizeDistributionDto } from './dto/create-prize-distribution.dto';
import { UpdatePrizeDistributionDto } from './dto/update-prize-distribution.dto';

@Injectable()
export class PrizeDistributionService {
  create(createPrizeDistributionDto: CreatePrizeDistributionDto) {
    return 'This action adds a new prizeDistribution';
  }

  findAll() {
    return `This action returns all prizeDistribution`;
  }

  findOne(id: number) {
    return `This action returns a #${id} prizeDistribution`;
  }

  update(id: number, updatePrizeDistributionDto: UpdatePrizeDistributionDto) {
    return `This action updates a #${id} prizeDistribution`;
  }

  remove(id: number) {
    return `This action removes a #${id} prizeDistribution`;
  }
}
