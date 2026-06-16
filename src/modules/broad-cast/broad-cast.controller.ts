import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BroadCastService } from './broad-cast.service';
import { CreateBroadCastDto } from './dto/create-broad-cast.dto';
import { UpdateBroadCastDto } from './dto/update-broad-cast.dto';

@Controller('broad-cast')
export class BroadCastController {
  constructor(private readonly broadCastService: BroadCastService) {}

  @Post()
  create(@Body() createBroadCastDto: CreateBroadCastDto) {
    return this.broadCastService.create(createBroadCastDto);
  }

  @Get()
  findAll() {
    return this.broadCastService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.broadCastService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBroadCastDto: UpdateBroadCastDto) {
    return this.broadCastService.update(+id, updateBroadCastDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.broadCastService.remove(+id);
  }
}
