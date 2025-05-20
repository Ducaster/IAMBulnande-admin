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
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event, Session } from './event.entity';
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
      project_date?: string;
    },
  ) {
    console.log('인증된 사용자:', req.user);
    return await this.eventsService.createEvent(eventData);
  }

  @Get()
  async getAllEvents(
    @Query('limit') limitStr?: string,
    @Query('nextPageKey') nextPageKey?: string,
    @Query('homepage') homepage?: string,
    @Query('all') allStr?: string,
  ) {
    // 문자열로 들어온 limit을 정수로 변환
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    // 문자열로 들어온 all을 boolean으로 변환 ('true'인 경우만 true로 처리)
    const all = allStr === 'true';

    return await this.eventsService.getAllEvents({
      limit,
      lastKey: nextPageKey,
      homepage,
      all,
    });
  }

  @Get(':uid')
  async getEvent(@Param('uid') uid: string) {
    return await this.eventsService.getEvent(uid);
  }

  @Put(':uid')
  @UseGuards(JwtAuthGuard)
  async updateEvent(
    @Param('uid') uid: string,
    @Body()
    eventData: Partial<Event> & {
      project_datetime?: string;
      project_date?: string;
    },
  ) {
    return await this.eventsService.updateEvent(uid, eventData);
  }

  @Delete(':uid')
  @UseGuards(JwtAuthGuard)
  async deleteEvent(@Param('uid') uid: string) {
    return await this.eventsService.deleteEvent(uid);
  }
}
