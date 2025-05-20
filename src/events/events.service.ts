import { Injectable } from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { Event, Session } from './event.entity';
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

    // 'long' 타입이고 sessions 배열이 있는 경우 회차 번호 검증 및 정리
    if (
      eventDataToSave.duration_type === 'long' &&
      Array.isArray(eventDataToSave.sessions)
    ) {
      // 회차 번호가 없는 경우 순차적으로 번호 부여
      eventDataToSave.sessions = eventDataToSave.sessions.map(
        (session, index) => {
          if (!session.number) {
            return { ...session, number: index + 1 };
          }
          return session;
        },
      );
    }
    // 'long' 타입이지만 sessions 배열이 없는 경우 빈 배열 초기화
    else if (
      eventDataToSave.duration_type === 'long' &&
      !eventDataToSave.sessions
    ) {
      eventDataToSave.sessions = [];
    }
    // 'short' 타입인데 sessions 배열이 있는 경우, 무시 (제거)
    else if (
      eventDataToSave.duration_type === 'short' &&
      eventDataToSave.sessions
    ) {
      delete eventDataToSave.sessions;
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
    all?: boolean;
  }) {
    return await this.eventsRepository.getAllEvents({
      limit: options.limit,
      lastEvaluatedKey: options.lastKey,
      homepage: options.homepage,
      all: options.all,
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

    // 'long' 타입으로 변경하거나, 이미 'long' 타입인 경우
    if (eventDataToUpdate.duration_type === 'long') {
      // end_date가 설정되지 않은 경우 자동 설정
      if (!eventDataToUpdate.end_date) {
        const currentEvent = await this.eventsRepository.getEvent(uid);
        const startDate = new Date(
          eventDataToUpdate.start_date || currentEvent.start_date,
        );
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        eventDataToUpdate.end_date = endDate.toISOString().split('T')[0];
      }

      // 'long' 타입이고 sessions 배열이 있는 경우 회차 번호 검증 및 정리
      if (Array.isArray(eventDataToUpdate.sessions)) {
        // 회차 번호가 없는 경우 순차적으로 번호 부여
        eventDataToUpdate.sessions = eventDataToUpdate.sessions.map(
          (session, index) => {
            if (!session.number) {
              return { ...session, number: index + 1 };
            }
            return session;
          },
        );
      }
      // 기존 이벤트가 'long' 타입이고 sessions 배열이 현재 요청에 없는 경우
      else if (eventDataToUpdate.sessions === undefined) {
        const currentEvent = await this.eventsRepository.getEvent(uid);

        // 현재 이벤트가 'short' 타입에서 'long' 타입으로 변경되는 경우
        if (currentEvent.duration_type === 'short') {
          eventDataToUpdate.sessions = [];
        }
        // 그렇지 않으면 기존 sessions 배열 유지 (eventDataToUpdate에 포함시키지 않음)
      }
    }
    // 'short' 타입으로 변경하는 경우
    else if (eventDataToUpdate.duration_type === 'short') {
      // 'short' 타입에서는 sessions 필드를 비움
      eventDataToUpdate.sessions = undefined;
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
