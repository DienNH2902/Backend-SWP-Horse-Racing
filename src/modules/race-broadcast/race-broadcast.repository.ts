import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RaceBroadcastService } from './race-broadcast.service';
import { CreateRaceBroadcastDto } from './dto/create-race-broadcast.dto';
import { UpdateRaceBroadcastDto } from './dto/update-race-broadcast.dto';

@Controller('race-broadcast')
export class RaceBroadcastController {
  constructor(private readonly raceBroadcastService: RaceBroadcastService) {}

  @Post()
  create(@Body() createRaceBroadcastDto: CreateRaceBroadcastDto) {
    return this.raceBroadcastService.create(createRaceBroadcastDto);
  }

  @Get()
  findAll() {
    return this.raceBroadcastService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.raceBroadcastService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRaceBroadcastDto: UpdateRaceBroadcastDto) {
    return this.raceBroadcastService.update(+id, updateRaceBroadcastDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.raceBroadcastService.remove(+id);
  }
}
