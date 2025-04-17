import { Injectable } from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { Event } from './event.entity';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentKSTDateISOString } from '../utils/date.utils';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async createEvent(
    eventData: Omit<Event, 'uid' | 'created_at' | 'updated_at'> & {
      project_datetime?: string;
    },
  ) {
    let eventDataToSave = { ...eventData };
    if (eventDataToSave.project_datetime) {
      const datetime = new Date(eventDataToSave.project_datetime);
      eventDataToSave.project_date = datetime.toISOString().split('T')[0];
      eventDataToSave.project_time = datetime
        .toISOString()
        .split('T')[1]
        .substring(0, 5);
      delete eventDataToSave.project_datetime;
    }

    const event: Event = {
      ...(eventDataToSave as any),
      uid: uuidv4(),
      created_at: getCurrentKSTDateISOString(),
      updated_at: getCurrentKSTDateISOString(),
    };
    return await this.eventsRepository.createEvent(event);
  }

  async getAllEvents() {
    return await this.eventsRepository.getAllEvents();
  }

  async getEvent(uid: string) {
    return await this.eventsRepository.getEvent(uid);
  }

  async updateEvent(
    uid: string,
    eventData: Partial<Event> & { project_datetime?: string },
  ) {
    let eventDataToUpdate = { ...eventData };

    if (eventDataToUpdate.project_datetime) {
      const datetime = new Date(eventDataToUpdate.project_datetime);
      eventDataToUpdate.project_date = datetime.toISOString().split('T')[0];
      eventDataToUpdate.project_time = datetime
        .toISOString()
        .split('T')[1]
        .substring(0, 5);
      delete eventDataToUpdate.project_datetime;
    }

    const updatedEvent = {
      ...eventDataToUpdate,
      updated_at: getCurrentKSTDateISOString(),
    };
    return await this.eventsRepository.updateEvent(uid, updatedEvent);
  }

  async deleteEvent(uid: string) {
    return await this.eventsRepository.deleteEvent(uid);
  }
}
