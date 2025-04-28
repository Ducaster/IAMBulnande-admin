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
      project_date?: string;
    },
  ) {
    let eventDataToSave = { ...eventData };

    if (eventDataToSave.project_datetime) {
      const datetime = new Date(eventDataToSave.project_datetime);
      eventDataToSave.start_date = datetime.toISOString().split('T')[0];
      eventDataToSave.project_time = datetime
        .toISOString()
        .split('T')[1]
        .substring(0, 5);
      delete eventDataToSave.project_datetime;
    }

    if (eventDataToSave.project_date && !eventDataToSave.start_date) {
      eventDataToSave.start_date = eventDataToSave.project_date;
      delete eventDataToSave.project_date;
    }

    if (eventDataToSave.duration_type === 'long' && !eventDataToSave.end_date) {
      const startDate = new Date(eventDataToSave.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      eventDataToSave.end_date = endDate.toISOString().split('T')[0];
    }

    if (!eventDataToSave.duration_type) {
      eventDataToSave.duration_type = 'short';
    }

    const event: Event = {
      ...(eventDataToSave as any),
      uid: uuidv4(),
      created_at: getCurrentKSTDateISOString(),
      updated_at: getCurrentKSTDateISOString(),
    };
    return await this.eventsRepository.createEvent(event);
  }

  async getAllEvents(options: {
    limit?: number;
    lastKey?: string;
    homepage?: string;
  }) {
    return await this.eventsRepository.getAllEvents({
      limit: options.limit,
      lastEvaluatedKey: options.lastKey,
      homepage: options.homepage,
    });
  }

  async getEvent(uid: string) {
    return await this.eventsRepository.getEvent(uid);
  }

  async updateEvent(
    uid: string,
    eventData: Partial<Event> & {
      project_datetime?: string;
      project_date?: string;
    },
  ) {
    let eventDataToUpdate = { ...eventData };

    if (eventDataToUpdate.project_datetime) {
      const datetime = new Date(eventDataToUpdate.project_datetime);
      eventDataToUpdate.start_date = datetime.toISOString().split('T')[0];
      eventDataToUpdate.project_time = datetime
        .toISOString()
        .split('T')[1]
        .substring(0, 5);
      delete eventDataToUpdate.project_datetime;
    }

    if (eventDataToUpdate.project_date && !eventDataToUpdate.start_date) {
      eventDataToUpdate.start_date = eventDataToUpdate.project_date;
      delete eventDataToUpdate.project_date;
    }

    if (
      eventDataToUpdate.duration_type === 'long' &&
      !eventDataToUpdate.end_date
    ) {
      const currentEvent = await this.eventsRepository.getEvent(uid);
      const startDate = new Date(
        eventDataToUpdate.start_date || currentEvent.start_date,
      );
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      eventDataToUpdate.end_date = endDate.toISOString().split('T')[0];
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
