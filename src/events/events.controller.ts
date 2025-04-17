import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './event.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('/api/v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createEvent(
    @Request() req,
    @Body()
    eventData: Omit<Event, 'uid' | 'created_at' | 'updated_at'> & {
      project_datetime?: string;
    },
  ) {
    console.log('인증된 사용자:', req.user);
    return await this.eventsService.createEvent(eventData);
  }

  @Get()
  async getAllEvents() {
    return await this.eventsService.getAllEvents();
  }

  @Get(':uid')
  async getEvent(@Param('uid') uid: string) {
    return await this.eventsService.getEvent(uid);
  }

  @Put(':uid')
  @UseGuards(JwtAuthGuard)
  async updateEvent(
    @Param('uid') uid: string,
    @Body() eventData: Partial<Event> & { project_datetime?: string },
  ) {
    return await this.eventsService.updateEvent(uid, eventData);
  }

  @Delete(':uid')
  @UseGuards(JwtAuthGuard)
  async deleteEvent(@Param('uid') uid: string) {
    return await this.eventsService.deleteEvent(uid);
  }
}
