import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PrizeDistributionService } from './prize-distribution.service';
import { CreatePrizeDistributionDto } from './dto/create-prize-distribution.dto';
import { UpdatePrizeDistributionDto } from './dto/update-prize-distribution.dto';

@Controller('prize-distribution')
export class PrizeDistributionController {
  constructor(private readonly prizeDistributionService: PrizeDistributionService) {}

  @Post()
  create(@Body() createPrizeDistributionDto: CreatePrizeDistributionDto) {
    return this.prizeDistributionService.create(createPrizeDistributionDto);
  }

  @Get()
  findAll() {
    return this.prizeDistributionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prizeDistributionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePrizeDistributionDto: UpdatePrizeDistributionDto) {
    return this.prizeDistributionService.update(+id, updatePrizeDistributionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prizeDistributionService.remove(+id);
  }
}
